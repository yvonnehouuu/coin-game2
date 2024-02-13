import * as anchor from "@coral-xyz/anchor";
import { CoinGame2, IDL } from "../target/types/coin_game2";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import * as web3 from "@solana/web3.js"
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, getAccount, createTransferInstruction } from "@solana/spl-token";
import { BN } from "bn.js";
import crypto from 'crypto';

import {
  createMintTx,
  executeTransaction,
  executeTransactions,
  withFindOrInitAssociatedTokenAccount,
  withWrapSol,
} from "@cardinal/common";


async function createMint(connection: web3.Connection, wallet: NodeWallet, rewardMintKeypair: web3.Keypair, rewardMintId: web3.PublicKey) {
  const [rewardMintTx] = await createMintTx(
    connection,
    rewardMintId,
    wallet.publicKey,
    { amount: 1000 }
  );
  const result = await executeTransaction(
    connection,
    new web3.Transaction().add(...rewardMintTx.instructions),
    wallet,
    { signers: [rewardMintKeypair] }
  );

  return result
}

describe("coin-game2", () => {
  /*
  Set up (connection/ wallet/ provider/ program...)
  */
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const commitment: web3.Commitment = "processed";
  const connection = new web3.Connection("http://localhost:8899", {
    commitment,
    wsEndpoint: "ws://localhost:8900/",
  });

  const options = anchor.AnchorProvider.defaultOptions();
  const wallet = NodeWallet.local();
  console.log('local wallet:', wallet.publicKey.toBase58());

  const provider = new anchor.AnchorProvider(connection, wallet, options);
  anchor.setProvider(provider);

  const programId = new web3.PublicKey('7m69C1L22UGQs4NBiyDaPvVz6WRiXKTiPTt1im2hr3Fw') //("9DhctujyrSRHgRw6gzNbj85LHJaExfE4JKPgN73byqat");
  const program = new anchor.Program(IDL, programId, provider);

  const testidentifier = `test2`;

  /*
  Create Mint
  */
  const rewardMintKeypair = web3.Keypair.generate();
  let rewardMintId = rewardMintKeypair.publicKey;

  it('Create Mint', async () => {
    console.log('------------- Hello player. -------------')
    const mint = await createMint(connection, wallet, rewardMintKeypair, rewardMintId)
    console.log('Mint:', mint)
  })

  console.log('rewardMintId:', rewardMintId)

  /*
  Init Reward Distributor
  */
  const rewardDistributorId = web3.PublicKey.findProgramAddressSync(
    [
      anchor.utils.bytes.utf8.encode("reward_distributor_state"),
      anchor.utils.bytes.utf8.encode(testidentifier)
    ],
    program.programId
  )[0];
  console.log('rewardDistributorId:', rewardDistributorId)

  let rewardDistributorAtaId
  let userRewardMintAta

  it('Init Reward Distributor', async () => {
    const tx = new web3.Transaction();
    const ix = await program.methods
      .initRewardDistributor({
        identifier: testidentifier,
      })
      .accounts({
        rewardDistributor: rewardDistributorId,
        rewardMint: rewardMintId,
        authority: provider.wallet.publicKey,
        player: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID
      })
      .instruction();
    tx.add(ix);

    rewardDistributorAtaId = await withFindOrInitAssociatedTokenAccount(
      tx,
      provider.connection,
      rewardMintId,
      rewardDistributorId,
      provider.wallet.publicKey,
      true
    );
    console.log('rewardDistributorAtaId:', rewardDistributorAtaId)

    userRewardMintAta = getAssociatedTokenAddressSync(
      rewardMintId,
      provider.wallet.publicKey
    );

    // set the initial amount
    tx.add(
      createTransferInstruction(
        userRewardMintAta,
        rewardDistributorAtaId,
        provider.wallet.publicKey,
        800
      )
    );

    // console.log('tx:', tx)
    const result = await executeTransaction(provider.connection, tx, provider.wallet);
    console.log('--------- Init Reward Distributor ---------')
    console.log('success', result)

    // get reward distributor
    let fetchedrewardDistributorId = await program.account.rewardDistributor.fetch(rewardDistributorId);
    console.log('fetchedrewardDistributorId:', fetchedrewardDistributorId)

    // confirm ata
    let rewardDistributorAta = await getAccount(
      provider.connection,
      rewardDistributorAtaId
    );
    console.log('rewardDistributorAta:', rewardDistributorAta.amount)

    let userMintAta = await getAccount(
      provider.connection,
      userRewardMintAta
    );
    console.log('userMintAta:', userMintAta.amount)

  })

  /*
  Start Game:
  1. Create Reward Entry (option) (只能一個所以還需要條件判斷) (先判斷用輸入的user's address建的reward entry是否存在，存在直接用不存在新建)
  2. Bet
  3. Play (head)
  */

  let address = provider.wallet.publicKey.toString()
  console.log('address:', address)
  let hexString = crypto.createHash('sha256').update(address, 'utf-8').digest('hex')
  console.log('hexString:', hexString)
  let entryIdentifier = Uint8Array.from(Buffer.from(hexString, 'hex'))
  console.log('entryIdentifier:', entryIdentifier)
  console.log('entryIdentifier:', bs58.encode(entryIdentifier))



  const rewardEntryId = web3.PublicKey.findProgramAddressSync(
    [
      anchor.utils.bytes.utf8.encode("reward_entry_state"),
      entryIdentifier
      //anchor.utils.bytes.utf8.encode(testidentifier)//provider.wallet.publicKey.toString()) // id should be user's address
    ],
    program.programId
  )[0];
  console.log('rewardEntryId:', rewardEntryId) 

  const gameStateId = web3.PublicKey.findProgramAddressSync(
    [
      anchor.utils.bytes.utf8.encode("game_state"),
      anchor.utils.bytes.utf8.encode('001')
    ],
    program.programId
  )[0];
  console.log('gameStateId:', gameStateId)

  it('Start Game(Head)', async () => {
    const tx = new web3.Transaction();
    const betIx = await program.methods
      .bet({
        betAmount: new BN(3),
        identifier: '001',//testidentifier
      })
      .accounts({
        rewardDistributor: rewardDistributorId,
        coinGame: gameStateId,
        rewardMint: rewardMintId,
        rewardDistributorTokenAccount: rewardDistributorAtaId,
        userRewardMintTokenAccount: userRewardMintAta,
        authority: provider.wallet.publicKey,
        player: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID
      })
      .instruction();

    const playIx = await program.methods
      .play({
        side: 1,  // Head test
      })
      .accounts({
        player: provider.wallet.publicKey,
        coinGame: gameStateId,
        rewardEntry: rewardEntryId,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .instruction();

    try {
      let findRrewardEntry = await program.account.rewardEntry.fetch(rewardEntryId);
      console.log('Already have reward entry:', findRrewardEntry)

      tx.add(betIx, playIx)
    } catch (error) {
      console.log('No reward entry')

      const initRewardEntryIx = await program.methods
        .initRewardEntry({
          identifier: provider.wallet.publicKey.toString(),
        })
        .accounts({
          rewardEntry: rewardEntryId,
          rewardDistributor: rewardDistributorId,
          rewardMint: rewardMintId,
          authority: provider.wallet.publicKey, //payer.publicKey, 
          player: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID
        })
        .instruction();

      tx.add(initRewardEntryIx, betIx, playIx)
    }
    // console.log('tx:', tx)

    const result = await executeTransaction(provider.connection, tx, provider.wallet);
    console.log('--------- Start Game ---------')
    console.log('success', result)

    // fetch programs
    let fetchedrewardEntryId = await program.account.rewardEntry.fetch(rewardEntryId);
    console.log('fetchedrewardEntryId:', fetchedrewardEntryId)

    let fetchedCoinGameStateId = await program.account.gameState.fetch(gameStateId);
    console.log('fetchedCoinGameStateId:', fetchedCoinGameStateId)

    let rewardDistributorAta = await getAccount(
      provider.connection,
      rewardDistributorAtaId
    );
    console.log('rewardDistributorAta:', rewardDistributorAta.amount)

    let userMintAta = await getAccount(
      provider.connection,
      userRewardMintAta
    );
    console.log('userMintAta:', userMintAta.amount)
  })

  /*
  Claim Reward
  */
  it('Claim Rewards', async () => {
    let getRewardAmount = await program.account.rewardEntry.fetch(rewardEntryId);
    let rewardAmount = getRewardAmount.rewardAmount
    console.log('rewardAmount:', rewardAmount)

    if (rewardAmount.eq(new BN(0))) {
      console.log('abaabaaba')
    } else {
      const tx = new web3.Transaction();
      const ix = await program.methods
        .claimRewards({})
        .accounts({
          rewardEntry: rewardEntryId,
          rewardDistributor: rewardDistributorId,
          rewardDistributorTokenAccount: rewardDistributorAtaId,
          userRewardMintTokenAccount: userRewardMintAta,
          authority: provider.wallet.publicKey,
          player: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID
        })
        .instruction();

      tx.add(ix)
      // console.log('tx:', tx)

      const result = await executeTransaction(provider.connection, tx, provider.wallet);
      console.log('--------- Claim Rewards ---------')
      console.log('success', result)

      let fetchedrewardEntryId = await program.account.rewardEntry.fetch(rewardEntryId);
      console.log('fetchedrewardEntryId:', fetchedrewardEntryId)

      let rewardDistributorAta = await getAccount(
        provider.connection,
        rewardDistributorAtaId
      );
      console.log('rewardDistributorAta:', rewardDistributorAta.amount)

      let userMintAta = await getAccount(
        provider.connection,
        userRewardMintAta
      );
      console.log('userMintAta:', userMintAta.amount)
    }
  })

  /*
  reclaim funds
  */
  it('Reclaim Funds', async () => {
    const tx = new web3.Transaction();
    const ix = await program.methods
      .reclaimFunds({
        amount: new BN(120),
      })
      .accounts({
        rewardDistributor: rewardDistributorId,
        rewardDistributorTokenAccount: rewardDistributorAtaId,
        authorityTokenAccount: userRewardMintAta,
        authority: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID
      })
      .instruction();

    tx.add(ix)
    // console.log('tx:', tx)

    const result = await executeTransaction(provider.connection, tx, provider.wallet);
    console.log('--------- Reclaim Funds ---------')
    console.log('success', result)

    let rewardDistributorAta = await getAccount(
      provider.connection,
      rewardDistributorAtaId
    );
    console.log('rewardDistributorAta:', rewardDistributorAta.amount)

    let userMintAta = await getAccount(
      provider.connection,
      userRewardMintAta
    );
    console.log('userMintAta:', userMintAta.amount)
  })
});
