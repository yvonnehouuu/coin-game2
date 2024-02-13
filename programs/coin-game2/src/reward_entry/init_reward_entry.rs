use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

// use crate::errors::ErrorCode;
use crate::RewardDistributor;
use crate::RewardEntry;
use crate::REWARD_ENTRY_PREFIX;
use crate::REWARD_ENTRY_SIZE;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitRewardEntryIx {
    // reward_amount: u64,
    identifier: String, //Pubkey, //u64,
}

#[derive(Accounts)]
#[instruction(ix: InitRewardEntryIx)]
pub struct InitRewardEntryCtx<'info> {
    #[account(
        init,
        payer = player,
        space = REWARD_ENTRY_SIZE,
        seeds = [
            REWARD_ENTRY_PREFIX.as_bytes(),
            &anchor_lang::solana_program::hash::hash(ix.identifier.as_bytes()).to_bytes()
            //ix.identifier.as_ref()
        ],
        bump,
    )]
    reward_entry: Box<Account<'info, RewardEntry>>,

    #[account(mut)]
    reward_distributor: Box<Account<'info, RewardDistributor>>,

    // #[account(mut)]
    // coin_game: Box<Account<'info, GameState>>,
    #[account(mut)]
    reward_mint: Box<Account<'info, Mint>>,

    #[account(mut)]
    authority: Signer<'info>,

    #[account(mut)]
    player: Signer<'info>,

    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitRewardEntryCtx>, ix: InitRewardEntryIx) -> Result<()> {
    let reward_entry = &mut ctx.accounts.reward_entry;

    reward_entry.bump = *ctx.bumps.get("reward_entry").unwrap();
    reward_entry.identifier = ix.identifier;
    reward_entry.reward_mint = ctx.accounts.reward_mint.key();
    // reward_entry.reward_amount = 2;

    Ok(())
}
