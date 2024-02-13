use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid side. Use 1 for heads, 2 for tails.")]
    InvalidSide,
    InvalidClaimAmount,
    InvalidRewardDistributorTokenAccount,
    InvalidAuthority,
    InvalidAuthorityTokenAccount
}