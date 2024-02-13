use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

// use crate::errors::ErrorCode;
use crate::RewardDistributor;
use crate::REWARD_DISTRIBUTOR_PREFIX;
use crate::REWARD_DISTRIBUTOR_SIZE;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitRewardDistributorIx {
    identifier: String, //u64,
}

#[derive(Accounts)]
#[instruction(ix: InitRewardDistributorIx)]
pub struct InitRewardDistributorCtx<'info> {
    #[account(
        init,
        payer = player,
        space = REWARD_DISTRIBUTOR_SIZE,
        seeds = [REWARD_DISTRIBUTOR_PREFIX.as_bytes(), ix.identifier.as_ref()],
        bump,
    )]
    reward_distributor: Box<Account<'info, RewardDistributor>>,

    #[account(mut)]
    reward_mint: Box<Account<'info, Mint>>,

    #[account(mut)]
    authority: Signer<'info>,

    #[account(mut)]
    player: Signer<'info>,

    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitRewardDistributorCtx>, ix: InitRewardDistributorIx) -> Result<()> {
    let reward_distributor = &mut ctx.accounts.reward_distributor;
    
    reward_distributor.bump = *ctx.bumps.get("reward_distributor").unwrap();
    reward_distributor.authority = ctx.accounts.authority.key();
    reward_distributor.identifier = ix.identifier;
    reward_distributor.reward_mint = ctx.accounts.reward_mint.key();

    Ok(())
}
