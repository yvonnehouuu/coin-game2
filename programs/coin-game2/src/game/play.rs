use anchor_lang::prelude::*;

use crate::errors::ErrorCode;
use crate::GameState;
use crate::RewardEntry;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct PlayIx {
    side: u8,
}

#[derive(Accounts)]
#[instruction(ix: PlayIx)]
pub struct PlayCtx<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(mut)]
    pub coin_game: Box<Account<'info, GameState>>,

    #[account(mut)]
    pub reward_entry: Box<Account<'info, RewardEntry>>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<PlayCtx>, ix: PlayIx) -> Result<()> {
    ctx.accounts.coin_game.player = ctx.accounts.player.key();

    if ix.side != 1 && ix.side != 2 {
        return Err(ErrorCode::InvalidSide.into());
    };

    let random_number = anchor_lang::solana_program::sysvar::clock::Clock::get()?.unix_timestamp as u8;
    let win_or_lose = random_number % 2 == ix.side - 1;

    if win_or_lose {
        ctx.accounts.coin_game.game_result = true;
        ctx.accounts.reward_entry.reward_amount = ctx.accounts.reward_entry.reward_amount + (ctx.accounts.coin_game.bet_amount * 2);
    } else {
        ctx.accounts.coin_game.game_result = false;
    }

    ctx.accounts.coin_game.side = ix.side;

    Ok(())
}