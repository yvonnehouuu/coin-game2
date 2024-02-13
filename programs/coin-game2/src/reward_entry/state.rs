use anchor_lang::prelude::*;

pub const REWARD_ENTRY_SIZE: usize = 8 + std::mem::size_of::<RewardEntry>() + 64; //8 + 1 + 32 + 32 + 8 + 32; //1 + 32 + 8 + 32 + 1 + 32 + 8 + 32;
pub const REWARD_ENTRY_PREFIX: &str = "reward_entry_state";

#[account]
pub struct RewardEntry {
    pub bump: u8,
    // pub authority: Pubkey,
    pub identifier: String,//Uint8Array,//Pubkey,//u64,
    // pub coin_game: Pubkey,
    pub reward_mint: Pubkey,
    pub reward_amount: u64
}
