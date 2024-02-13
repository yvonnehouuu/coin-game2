use anchor_lang::prelude::*;
use anchor_spl::token::{Token, self, TokenAccount};

use crate::errors::ErrorCode;
use crate::RewardDistributor;
use crate::REWARD_DISTRIBUTOR_PREFIX;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ReclaimFundsIx {
    amount: u64
}

#[derive(Accounts)]
pub struct ReclaimFundsCtx<'info> {
    #[account(mut)]
    reward_distributor: Box<Account<'info, RewardDistributor>>,

    #[account(mut, constraint = reward_distributor_token_account.owner == reward_distributor.key() && reward_distributor_token_account.mint == reward_distributor.reward_mint @ ErrorCode::InvalidRewardDistributorTokenAccount)]
    reward_distributor_token_account: Box<Account<'info, TokenAccount>>,
    
    #[account(mut, constraint = authority_token_account.owner == authority.key() && authority_token_account.mint == reward_distributor.reward_mint @ ErrorCode::InvalidAuthorityTokenAccount)]
    authority_token_account: Box<Account<'info, TokenAccount>>,
    
    #[account(mut, constraint = authority.key() == reward_distributor.authority @ ErrorCode::InvalidAuthority)]
    authority: Signer<'info>,

    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ReclaimFundsCtx>, ix: ReclaimFundsIx) -> Result<()> {
    let reward_distributor = &mut ctx.accounts.reward_distributor;
    let reward_distributor_seed = &[REWARD_DISTRIBUTOR_PREFIX.as_bytes(), reward_distributor.identifier.as_ref(), &[reward_distributor.bump]];
    let reward_distributor_signer = &[&reward_distributor_seed[..]];
    
    let cpi_accounts = token::Transfer {
        from: ctx.accounts.reward_distributor_token_account.to_account_info(),
        to: ctx.accounts.authority_token_account.to_account_info(),
        authority: reward_distributor.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(reward_distributor_signer);
    // todo this could be an issue and get stuck, might need 2 transfers
    token::transfer(cpi_context, ix.amount)?; //reward_amount_to_receive.try_into().expect("Too many rewards to receive")

    Ok(())
}