import * as anchor from "@coral-xyz/anchor";
import { CoinGame2, IDL } from "../target/types/coin_game2";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import * as web3 from "@solana/web3.js"
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, getAccount, createTransferInstruction } from "@solana/spl-token";
import { BN } from "bn.js";

import {
  createMintTx,
  executeTransaction,
  executeTransactions,
  withFindOrInitAssociatedTokenAccount,
  withWrapSol,
} from "@cardinal/common";


async function getBalance(connection: web3.Connection, accountPublicKey: web3.PublicKey): Promise<number> {
  try {
    const balance = await connection.getBalance(accountPublicKey);
    const solBalance = balance / Math.pow(10, 9);
    return solBalance;
  } catch (error) {
    console.error('error:', error);
  }
}

async function airdrop(connection: web3.Connection, wallet: NodeWallet, toPublicKey: web3.PublicKey, lamports: number): Promise<number> {
  const latestBlockhash = await connection.getLatestBlockhash('finalized');
  const transaction = new web3.Transaction({
    recentBlockhash: latestBlockhash.blockhash,
  }).add(
    web3.SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: toPublicKey,
      lamports,
    })
  );

  const walletSigner = web3.Keypair.fromSecretKey(bs58.decode("5BcPZ3jS88D2Ld4FpSY5v8a9wrMuXSsAiKWHup4KnS2inSAiooFk8p7X2UdHUf1vvzSHhtBH2kT4hmddndRh6unu"));
  transaction.sign(walletSigner);

  await web3.sendAndConfirmTransaction(connection, transaction, [walletSigner]);

  const balance = await connection.getBalance(toPublicKey);
  return balance / Math.pow(10, 9);
}

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
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  // const program = anchor.workspace.CoinGame as Program<CoinGame>; // 9DhctujyrSRHgRw6gzNbj85LHJaExfE4JKPgN73byqat

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

  // console.log(program)

  const payer = web3.Keypair.fromSecretKey(bs58.decode("5bWeJ4Y9KWGTpYS4Ze28aSRtCtsPysGMb5AFs4LQZusP4h9yRD711VrWWHDt8cFjtDF1NVsX5tBnM73LoVK9PMCs"));
  console.log('Player Address:', payer.publicKey.toBase58())

  const testidentifier = `test2`;
  const gameStateId = web3.PublicKey.findProgramAddressSync(
    [
      anchor.utils.bytes.utf8.encode("game_state"),
      anchor.utils.bytes.utf8.encode(testidentifier)
    ],
    program.programId
  )[0];
  console.log('gameStateId:', gameStateId)

  const rewardDistributorId = web3.PublicKey.findProgramAddressSync(
    [
      anchor.utils.bytes.utf8.encode("reward_distributor_state"),
      anchor.utils.bytes.utf8.encode(testidentifier)
    ],
    program.programId
  )[0];
  console.log('rewardDistributorId:', rewardDistributorId)

  const rewardEntryId = web3.PublicKey.findProgramAddressSync(
    [
      anchor.utils.bytes.utf8.encode("reward_entry_state"),
      anchor.utils.bytes.utf8.encode(testidentifier)
    ],
    program.programId
  )[0];
  console.log('rewardEntryId:', rewardEntryId)




  const rewardMintKeypair = web3.Keypair.generate();
  let rewardMintId = rewardMintKeypair.publicKey;








  it('Set up', async () => {
    // console.log('--------- Before ---------')
    // console.log('local(sol):', await getBalance(connection, wallet.publicKey))
    // console.log('player(sol):', await getBalance(connection, payer.publicKey))

    // console.log('--------- After ---------')
    // console.log('player(sol):', await airdrop(connection, wallet, payer.publicKey, 3000000000))
    // console.log('local(sol):', await getBalance(connection, wallet.publicKey))

    console.log('--------------------------')
    console.log('hello player.')

    const r = await createMint(connection, wallet, rewardMintKeypair, rewardMintId)
    console.log('r:', r)
  })

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
        rewardMint: rewardMintId, //new web3.PublicKey('So11111111111111111111111111111111111111112'),
        authority: provider.wallet.publicKey, //payer.publicKey,
        player: provider.wallet.publicKey, //payer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID
      })
      .instruction();
    tx.add(ix);

    userRewardMintAta = getAssociatedTokenAddressSync(
      rewardMintId, //new web3.PublicKey('So11111111111111111111111111111111111111112'),
      provider.wallet.publicKey
    );

    rewardDistributorAtaId = await withFindOrInitAssociatedTokenAccount(
      tx,
      provider.connection,
      rewardMintId, //new web3.PublicKey('So11111111111111111111111111111111111111112'),
      rewardDistributorId,
      provider.wallet.publicKey, //provider.wallet
      true
    );
    console.log('rewardDistributorAtaId:', rewardDistributorAtaId)

    tx.add(
      createTransferInstruction(
        userRewardMintAta,
        rewardDistributorAtaId,
        provider.wallet.publicKey,
        100
      )
    );

    // console.log('tx:', tx)

    const result = await executeTransaction(provider.connection, tx, provider.wallet);
    console.log('--------- Init Reward Distributor ---------')
    console.log('success', result)

    let rewardDistributorAta = await getAccount(
      provider.connection,
      rewardDistributorAtaId
    );
    console.log('rewardDistributorAta:', rewardDistributorAta)

    let fetchedrewardDistributorId = await program.account.rewardDistributor.fetch(rewardDistributorId);
    console.log('fetchedrewardDistributorId:', fetchedrewardDistributorId)

    let userMintAta = await getAccount(
      provider.connection,
      userRewardMintAta
    );
    console.log('userMintAta:', userMintAta)

  })

  it("play game", async () => {
    const tx = new web3.Transaction();
    const ix = await program.methods
      .play({
        side: 1,  // Head test
        identifier: testidentifier,
      })
      .accounts({
        player: provider.wallet.publicKey,
        coinGame: gameStateId,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .instruction();

    tx.add(ix)

    const result = await executeTransaction(provider.connection, tx, provider.wallet);
    console.log('--------- Play Game ---------')
    console.log('success', result)

    let fetchedCoinGameStateId = await program.account.gameState.fetch(gameStateId);
    console.log('fetchedCoinGameStateId:', fetchedCoinGameStateId)
  })

  it('Bet', async () => {
    const tx = new web3.Transaction();
    const ix =  await program.methods
      .bet({})
      .accounts({
        rewardDistributor: rewardDistributorId,
        coinGame: gameStateId,
        rewardMint: rewardMintId,
        rewardDistributorTokenAccount: rewardDistributorAtaId, //rewardDistributorAta,
        userRewardMintTokenAccount: userRewardMintAta, //userMintAta,
        authority: provider.wallet.publicKey, //payer.publicKey, 
        player: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID
      })
      .instruction();

    tx.add(ix)

    const result = await executeTransaction(provider.connection, tx, provider.wallet);
    console.log('--------- Bet ---------')
    console.log('success', result)

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

  it('Init Reward Entry', async () => {
    const tx = new web3.Transaction();
    const ix = await program.methods
      .initRewardEntry({
        identifier: testidentifier,
      })
      .accounts({
        rewardEntry: rewardEntryId,
        rewardDistributor: rewardDistributorId,
        coinGame: gameStateId,
        rewardMint: rewardMintId,
        authority: provider.wallet.publicKey, //payer.publicKey, 
        player: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID
      })
      .instruction();

    tx.add(ix)

    const result = await executeTransaction(provider.connection, tx, provider.wallet);
    console.log('--------- Init Reward Entry ---------')
    console.log('success', result)

    let fetchedrewardEntryId = await program.account.rewardEntry.fetch(rewardEntryId);
    console.log('fetchedrewardEntryId:', fetchedrewardEntryId)
  })

  it('Claim Rewards', async () => {
    const tx = new web3.Transaction();
    const ix = await program.methods
      .claimRewards({})
      .accounts({
        rewardEntry: rewardEntryId,
        rewardDistributor: rewardDistributorId,
        coinGame: gameStateId,
        rewardMint: rewardMintId,
        rewardDistributorTokenAccount: rewardDistributorAtaId, //rewardDistributorAta,
        userRewardMintTokenAccount: userRewardMintAta, //userMintAta,
        authority: provider.wallet.publicKey, //payer.publicKey, 
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
  })
});
