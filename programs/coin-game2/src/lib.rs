use anchor_lang::prelude::*;
use game::*;
use reward_distributor::*;
use reward_entry::*;

pub mod errors;
pub mod game;
pub mod reward_distributor;
pub mod reward_entry;

declare_id!("7m69C1L22UGQs4NBiyDaPvVz6WRiXKTiPTt1im2hr3Fw");

#[program]
pub mod coin_game2 {
    use super::*;

    pub fn play(ctx: Context<PlayCtx>, ix: PlayIx) -> Result<()> {
        game::play::handler(ctx, ix)
    }

    pub fn bet(ctx: Context<BetCtx>, ix: BetIx) -> Result<()> {
        game::bet::handler(ctx, ix)
    }

    pub fn init_reward_distributor(ctx: Context<InitRewardDistributorCtx>, ix: InitRewardDistributorIx) -> Result<()> {
        reward_distributor::init_reward_distributor::handler(ctx, ix)
    }

    pub fn reclaim_funds(ctx: Context<ReclaimFundsCtx>, ix: ReclaimFundsIx) -> Result<()> {
        reward_distributor::reclaim_funds::handler(ctx, ix)
    }

    pub fn init_reward_entry(ctx: Context<InitRewardEntryCtx>, ix: InitRewardEntryIx) -> Result<()> {
        reward_entry::init_reward_entry::handler(ctx, ix)
    }

    pub fn claim_rewards(ctx: Context<ClaimRewardsCtx>, ix: ClaimRewardsIx) -> Result<()> {
        reward_entry::claim_rewards::handler(ctx, ix)
    }
}
