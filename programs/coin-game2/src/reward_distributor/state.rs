use anchor_lang::prelude::*;

pub const REWARD_DISTRIBUTOR_SIZE: usize = 8 + std::mem::size_of::<RewardDistributor>() + 64; //1 + 32 + 8 + 32 + 1 + 32 + 8 + 32;
pub const REWARD_DISTRIBUTOR_PREFIX: &str = "reward_distributor_state";

#[account]
pub struct RewardDistributor {
    pub bump: u8,
    pub authority: Pubkey,
    pub identifier: String, //u64,
    // pub coin_game: Pubkey,
    pub reward_mint: Pubkey,
}

