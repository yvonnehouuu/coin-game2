use anchor_lang::prelude::*;

pub const GAME_DEFAULT_SIZE: usize = 8 + std::mem::size_of::<GameState>() + 64; //1 + 8 + 32;
pub const GAME_PREFIX: &str = "game_state";

#[account]
pub struct GameState {
    pub identifier: String,
    pub game_result: bool,
    pub player: Pubkey,
    pub bet: bool,
    pub bet_amount: u64,
    pub side: u8,
}