use anchor_lang::prelude::*;
use anchor_spl::token::{Token, self, TokenAccount};

use crate::errors::ErrorCode;
use crate::RewardDistributor;
use crate::RewardEntry;
use crate::REWARD_DISTRIBUTOR_PREFIX;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ClaimRewardsIx {

}

#[derive(Accounts)]
#[instruction(ix: ClaimRewardsIx)]
pub struct ClaimRewardsCtx<'info> {
    #[account(mut)]
    reward_entry: Box<Account<'info, RewardEntry>>,

    #[account(mut)]
    reward_distributor: Box<Account<'info, RewardDistributor>>,

    // #[account(mut)]
    // coin_game: Box<Account<'info, GameState>>,
    
    // #[account(mut)]
    // reward_mint: Box<Account<'info, Mint>>,

    #[account(mut, constraint = reward_distributor_token_account.owner == reward_distributor.key() && reward_distributor_token_account.mint == reward_distributor.reward_mint @ ErrorCode::InvalidRewardDistributorTokenAccount)]
    reward_distributor_token_account: Account<'info, TokenAccount>,

    #[account(mut)] 
    user_reward_mint_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    authority: Signer<'info>,

    #[account(mut)]
    player: Signer<'info>,

    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
}


pub fn handler(ctx: Context<ClaimRewardsCtx>, _ix: ClaimRewardsIx) -> Result<()> {
    let reward_distributor = &mut ctx.accounts.reward_distributor;
    let reward_distributor_seed = &[REWARD_DISTRIBUTOR_PREFIX.as_bytes(), reward_distributor.identifier.as_ref(), &[reward_distributor.bump]];
    let reward_distributor_signer = &[&reward_distributor_seed[..]];
    
    let cpi_accounts = token::Transfer {
        from: ctx.accounts.reward_distributor_token_account.to_account_info(),
        to: ctx.accounts.user_reward_mint_token_account.to_account_info(),
        authority: reward_distributor.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(reward_distributor_signer);
    // todo this could be an issue and get stuck, might need 2 transfers
    token::transfer(cpi_context, ctx.accounts.reward_entry.reward_amount)?; //reward_amount_to_receive.try_into().expect("Too many rewards to receive")

    
    let reward_entry = &mut ctx.accounts.reward_entry;

    reward_entry.reward_amount = 0;

    Ok(())
}
