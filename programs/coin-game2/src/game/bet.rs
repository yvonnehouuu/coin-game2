use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, self, TokenAccount};

use crate::errors::ErrorCode;
use crate::RewardDistributor;
use crate::GameState;
// use crate::RewardEntry;
use crate::GAME_DEFAULT_SIZE;
use crate::GAME_PREFIX;
use crate::program::CoinGame2;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct BetIx {
    bet_amount: u64,
    identifier: String,
}

#[derive(Accounts)]
#[instruction(ix: BetIx)]
pub struct BetCtx<'info> {
    #[account(mut)]
    reward_distributor: Box<Account<'info, RewardDistributor>>,

    #[account(
        init,
        seeds = [GAME_PREFIX.as_bytes(), ix.identifier.as_ref()],
        bump,
        payer = player,
        space = GAME_DEFAULT_SIZE
    )]
    coin_game: Box<Account<'info, GameState>>,

    #[account(mut)]
    reward_mint: Box<Account<'info, Mint>>,

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

pub fn handler(ctx: Context<BetCtx>, ix: BetIx) -> Result<()> {
    let cpi_accounts = token::Transfer {
        from: ctx.accounts.user_reward_mint_token_account.to_account_info(),
        to: ctx.accounts.reward_distributor_token_account.to_account_info(),
        authority: ctx.accounts.player.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
    // todo this could be an issue and get stuck, might need 2 transfers
    token::transfer(cpi_context, ix.bet_amount)?; //reward_amount_to_receive.try_into().expect("Too many rewards to receive")

    let coin_game = &mut ctx.accounts.coin_game;
    coin_game.identifier = ix.identifier;
    coin_game.bet = true;
    coin_game.bet_amount = ix.bet_amount;

    Ok(())
}
