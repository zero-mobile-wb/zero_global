import { PublicKey } from "@solana/web3.js";

// ── Program ────────────────────────────────────────────────────
export const PROGRAM_ID = new PublicKey(
  "GDngDc6zfRcgs24bBd4nHwqFKUHQpt17f5koAY2riZDB"
);

// ── USDC ──────────────────────────────────────────────────────
// Devnet USDC mint (Circle's official devnet USDC)
export const USDC_MINT_DEVNET = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);
// Mainnet USDC mint — swap this in for production
export const USDC_MINT_MAINNET = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);

export const USDC_DECIMALS = 6;

// ── PDA Seeds (must match the Rust contract) ──────────────────
export const TREASURY_VAULT_SEED = Buffer.from("treasury_vault");
export const COMPANY_ACCOUNT_SEED = Buffer.from("company_account");
export const TX_LOG_SEED = Buffer.from("tx_log");
export const SUB_ACCOUNT_SEED = Buffer.from("sub_account");

// ── Network ───────────────────────────────────────────────────
export const DEVNET_RPC = "https://api.devnet.solana.com";
