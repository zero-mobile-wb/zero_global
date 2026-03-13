// ============================================================
// Zero Global Treasury — Anchor Smart Contract
// Powers cross-border stablecoin payments via USDC
// for the Zero Global platform and Zero Mobile wallet.
// ============================================================

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("FnRUAeYRRpuj3E5k3SuaGtRhR6hX1NWzKzHEfWaVQKSM");

// ── Seeds ────────────────────────────────────────────────────
pub const TREASURY_VAULT_SEED: &[u8] = b"treasury_vault";
pub const COMPANY_ACCOUNT_SEED: &[u8] = b"company_account";
pub const SUB_ACCOUNT_SEED: &[u8] = b"sub_account";

// ── Program entrypoint ───────────────────────────────────────
#[program]
pub mod zero_global_treasury {
    use super::*;

    // ─────────────────────────────────────────────────────────
    // 1. COMPANY REGISTRATION
    //    Registers a business wallet with the Zero Global
    //    treasury. Each company gets a unique on-chain account
    //    derived from their wallet + company_id.
    // ─────────────────────────────────────────────────────────
    pub fn create_company_account(
        ctx: Context<CreateCompanyAccount>,
        company_id: String,
    ) -> Result<()> {
        // Validate company_id length to prevent oversized strings
        require!(
            company_id.len() >= 3 && company_id.len() <= 64,
            ZeroGlobalError::InvalidCompanyId
        );

        let company = &mut ctx.accounts.company_account;
        let clock = Clock::get()?;

        company.company_wallet = ctx.accounts.signer.key();
        company.company_id = company_id.clone();
        company.treasury_balance = 0;
        company.created_at = clock.unix_timestamp;
        company.bump = ctx.bumps.company_account;

        emit!(CompanyRegistered {
            company_wallet: company.company_wallet,
            company_id,
            created_at: company.created_at,
        });

        msg!(
            "Zero Global: Company account created for wallet {}",
            company.company_wallet
        );
        Ok(())
    }

    // ─────────────────────────────────────────────────────────
    // 2. INITIALISE TREASURY VAULT
    //    Creates the PDA-controlled USDC token account that
    //    acts as the shared treasury vault for the program.
    //    Must be called once before any deposits can occur.
    // ─────────────────────────────────────────────────────────
    pub fn initialize_treasury_vault(ctx: Context<InitializeTreasuryVault>) -> Result<()> {
        let vault = &mut ctx.accounts.treasury_vault_state;
        vault.usdc_mint = ctx.accounts.usdc_mint.key();
        vault.vault_token_account = ctx.accounts.vault_token_account.key();
        vault.bump = ctx.bumps.treasury_vault_state;
        vault.total_deposited = 0;
        vault.total_withdrawn = 0;
        vault.total_payments_sent = 0;

        msg!(
            "Zero Global: Treasury vault initialised with USDC mint {}",
            vault.usdc_mint
        );
        Ok(())
    }

    // ─────────────────────────────────────────────────────────
    // 3. DEPOSIT TO TREASURY
    //    Transfers USDC from a company's external wallet into
    //    the program-controlled vault PDA.
    //    Updates the company's internal treasury_balance.
    // ─────────────────────────────────────────────────────────
    pub fn deposit_to_treasury(ctx: Context<DepositToTreasury>, amount: u64, payment_reference: String) -> Result<()> {
        require!(amount > 0, ZeroGlobalError::InvalidAmount);
        require!(
            payment_reference.len() <= 64,
            ZeroGlobalError::ReferenceTooLong
        );

        // CPI: transfer USDC from company ATA → vault token account
        let cpi_accounts = Transfer {
            from: ctx.accounts.company_token_account.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.signer.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        // Update company treasury balance
        let company = &mut ctx.accounts.company_account;
        company.treasury_balance = company
            .treasury_balance
            .checked_add(amount)
            .ok_or(ZeroGlobalError::ArithmeticOverflow)?;

        // Update global vault stats
        let vault = &mut ctx.accounts.treasury_vault_state;
        vault.total_deposited = vault
            .total_deposited
            .checked_add(amount)
            .ok_or(ZeroGlobalError::ArithmeticOverflow)?;

        emit!(TreasuryDeposit {
            company_wallet: ctx.accounts.signer.key(),
            amount,
            new_balance: company.treasury_balance,
        });

        // ── Write TransactionLog ──────────────────────────────
        let clock = Clock::get()?;
        let log = &mut ctx.accounts.transaction_log;
        log.sender_company = ctx.accounts.signer.key();
        log.recipient_wallet = vault.vault_token_account; // Treasury
        log.amount = amount;
        log.timestamp = clock.unix_timestamp;
        log.payment_type = PaymentType::Deposit;
        log.payment_reference = payment_reference;
        log.bump = ctx.bumps.transaction_log;

        msg!(
            "Zero Global: Deposited {} USDC for company {}. New balance: {}",
            amount,
            company.company_id,
            company.treasury_balance
        );
        Ok(())
    }

    // ─────────────────────────────────────────────────────────
    // 4. CREATE PAYMENT (Cross-Border Transfer)
    //    Sends USDC from the company's treasury balance to any
    //    recipient wallet on Solana. Vault PDA authorises the
    //    SPL token transfer via a PDA signer seed.
    //    Creates an immutable TransactionLog on-chain.
    // ─────────────────────────────────────────────────────────
    pub fn create_payment(
        ctx: Context<CreatePayment>,
        amount: u64,
        payment_reference: String,
    ) -> Result<()> {
        require!(amount > 0, ZeroGlobalError::InvalidAmount);
        require!(
            payment_reference.len() <= 64,
            ZeroGlobalError::InvalidReference
        );

        let company = &mut ctx.accounts.company_account;

        // ── Balance check ─────────────────────────────────────
        require!(
            company.treasury_balance >= amount,
            ZeroGlobalError::InsufficientTreasuryBalance
        );

        // ── Deduct balance before transfer (checks-effects-interactions) ──
        company.treasury_balance = company
            .treasury_balance
            .checked_sub(amount)
            .ok_or(ZeroGlobalError::ArithmeticOverflow)?;

        // ── CPI: vault PDA → recipient ATA ───────────────────
        // The vault state PDA signs for the token account transfer
        let vault_bump = ctx.accounts.treasury_vault_state.bump;
        let seeds: &[&[u8]] = &[TREASURY_VAULT_SEED, &[vault_bump]];
        let signer_seeds = &[seeds];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_token_account.to_account_info(),
            to: ctx.accounts.recipient_token_account.to_account_info(),
            authority: ctx.accounts.treasury_vault_state.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );
        token::transfer(cpi_ctx, amount)?;

        // ── Update vault stats ────────────────────────────────
        let vault = &mut ctx.accounts.treasury_vault_state;
        vault.total_payments_sent = vault
            .total_payments_sent
            .checked_add(amount)
            .ok_or(ZeroGlobalError::ArithmeticOverflow)?;

        // ── Write TransactionLog ──────────────────────────────
        let clock = Clock::get()?;
        let log = &mut ctx.accounts.transaction_log;
        log.sender_company = ctx.accounts.signer.key();
        log.recipient_wallet = ctx.accounts.recipient_wallet.key();
        log.amount = amount;
        log.timestamp = clock.unix_timestamp;
        log.payment_type = PaymentType::CrossBorder;
        log.payment_reference = payment_reference.clone();
        log.bump = ctx.bumps.transaction_log;

        emit!(PaymentSent {
            sender_company: log.sender_company,
            recipient_wallet: log.recipient_wallet,
            amount,
            timestamp: log.timestamp,
            payment_reference,
        });

        msg!(
            "Zero Global: Payment of {} USDC sent from {} to {}",
            amount,
            ctx.accounts.signer.key(),
            ctx.accounts.recipient_wallet.key()
        );
        Ok(())
    }

    // ─────────────────────────────────────────────────────────
    // 5. WITHDRAW FROM TREASURY
    //    Allows a company owner to withdraw USDC back to their
    //    own wallet. Only the wallet that created the company
    //    account may authorise this instruction.
    // ─────────────────────────────────────────────────────────
    pub fn withdraw_from_treasury(ctx: Context<WithdrawFromTreasury>, amount: u64, withdrawal_reference: String) -> Result<()> {
        require!(amount > 0, ZeroGlobalError::InvalidAmount);
        require!(
            withdrawal_reference.len() <= 64,
            ZeroGlobalError::ReferenceTooLong
        );

        let company = &mut ctx.accounts.company_account;

        // ── Ownership check (belt-and-suspenders over Anchor constraint) ──
        require!(
            company.company_wallet == ctx.accounts.signer.key(),
            ZeroGlobalError::Unauthorised
        );

        // ── Balance check ─────────────────────────────────────
        require!(
            company.treasury_balance >= amount,
            ZeroGlobalError::InsufficientTreasuryBalance
        );

        // ── Deduct balance first ──────────────────────────────
        company.treasury_balance = company
            .treasury_balance
            .checked_sub(amount)
            .ok_or(ZeroGlobalError::ArithmeticOverflow)?;

        // ── CPI: vault PDA → company ATA ─────────────────────
        let vault_bump = ctx.accounts.treasury_vault_state.bump;
        let seeds: &[&[u8]] = &[TREASURY_VAULT_SEED, &[vault_bump]];
        let signer_seeds = &[seeds];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_token_account.to_account_info(),
            to: ctx.accounts.company_token_account.to_account_info(),
            authority: ctx.accounts.treasury_vault_state.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );
        token::transfer(cpi_ctx, amount)?;

        // ── Update vault stats ────────────────────────────────
        let vault = &mut ctx.accounts.treasury_vault_state;
        vault.total_withdrawn = vault
            .total_withdrawn
            .checked_add(amount)
            .ok_or(ZeroGlobalError::ArithmeticOverflow)?;

        emit!(TreasuryWithdrawal {
            company_wallet: ctx.accounts.signer.key(),
            amount,
            remaining_balance: company.treasury_balance,
        });

        // ── Write TransactionLog ──────────────────────────────
        let clock = Clock::get()?;
        let log = &mut ctx.accounts.transaction_log;
        log.sender_company = ctx.accounts.signer.key();
        log.recipient_wallet = ctx.accounts.signer.key(); // Withdrawn to self
        log.amount = amount;
        log.timestamp = clock.unix_timestamp;
        log.payment_type = PaymentType::Withdrawal;
        log.payment_reference = withdrawal_reference;
        log.bump = ctx.bumps.transaction_log;

        msg!(
            "Zero Global: Withdrawn {} USDC to company wallet {}. Remaining: {}",
            amount,
            ctx.accounts.signer.key(),
            company.treasury_balance
        );
        Ok(())
    }

    // ─────────────────────────────────────────────────────────
    // 6. CREATE SUB-ACCOUNT
    //    Creates a named sub-account PDA under a company.
    //    Each sub-account is keyed by:
    //      [sub_account_seed, company_wallet, name]
    //    so one company wallet can have many named sub-accounts.
    // ─────────────────────────────────────────────────────────
    pub fn create_sub_account(
        ctx: Context<CreateSubAccount>,
        name: String,
        action_reference: String,
    ) -> Result<()> {
        require!(
            name.len() >= 3,
            ZeroGlobalError::SubAccountNameTooShort
        );
        require!(
            name.len() <= 32,
            ZeroGlobalError::SubAccountNameTooLong
        );

        let clock = Clock::get()?;
        let sub = &mut ctx.accounts.sub_account;

        sub.owner          = ctx.accounts.signer.key();
        sub.company_account = ctx.accounts.company_account.key();
        sub.name           = name.clone();
        sub.balance        = 0;
        sub.created_at     = clock.unix_timestamp;
        sub.bump           = ctx.bumps.sub_account;

        emit!(SubAccountCreated {
            company_wallet: sub.owner,
            name: name.clone(),
            created_at: sub.created_at,
        });

        // Write TransactionLog
        let log = &mut ctx.accounts.transaction_log;
        log.sender_company = ctx.accounts.signer.key();
        log.recipient_wallet = sub.key(); 
        log.amount = 0;
        log.timestamp = clock.unix_timestamp;
        log.payment_type = PaymentType::SubAccountCreated;
        log.payment_reference = action_reference;
        log.bump = ctx.bumps.transaction_log;

        msg!(
            "Zero Global: Sub-account '{}' created for company wallet {}",
            name,
            sub.owner
        );
        Ok(())
    }

    // ─────────────────────────────────────────────────────────
    // 7. FUND SUB-ACCOUNT
    //    Moves USDC allocation from the company's treasury
    //    balance into the sub-account's balance.
    //    No SPL token transfer — pure on-chain bookkeeping.
    // ─────────────────────────────────────────────────────────
    pub fn fund_sub_account(
        ctx: Context<FundSubAccount>,
        amount: u64,
        action_reference: String,
    ) -> Result<()> {
        require!(amount > 0, ZeroGlobalError::InvalidAmount);

        let company = &mut ctx.accounts.company_account;

        // Ownership check
        require!(
            company.company_wallet == ctx.accounts.signer.key(),
            ZeroGlobalError::Unauthorised
        );

        // Balance check
        require!(
            company.treasury_balance >= amount,
            ZeroGlobalError::InsufficientCompanyBalance
        );

        // Deduct from company first (checks-effects)
        company.treasury_balance = company
            .treasury_balance
            .checked_sub(amount)
            .ok_or(ZeroGlobalError::ArithmeticOverflow)?;

        // Credit the sub-account
        let sub = &mut ctx.accounts.sub_account;
        sub.balance = sub
            .balance
            .checked_add(amount)
            .ok_or(ZeroGlobalError::ArithmeticOverflow)?;

        emit!(SubAccountFunded {
            company_wallet: ctx.accounts.signer.key(),
            sub_account_name: sub.name.clone(),
            amount,
            new_sub_balance: sub.balance,
            remaining_company_balance: company.treasury_balance,
        });

        // Write TransactionLog
        let clock = Clock::get()?;
        let log = &mut ctx.accounts.transaction_log;
        log.sender_company = ctx.accounts.signer.key();
        log.recipient_wallet = sub.key();
        log.amount = amount;
        log.timestamp = clock.unix_timestamp;
        log.payment_type = PaymentType::SubAccountFunded;
        log.payment_reference = action_reference;
        log.bump = ctx.bumps.transaction_log;

        msg!(
            "Zero Global: Funded sub-account '{}' with {} USDC. \
             Sub balance: {}. Company remaining: {}",
            sub.name,
            amount,
            sub.balance,
            company.treasury_balance
        );
        Ok(())
    }

    // ─────────────────────────────────────────────────────────
    // 8. WITHDRAW FROM SUB-ACCOUNT
    //    Moves USDC allocation from a sub-account back to
    //    the main company treasury balance.
    // ─────────────────────────────────────────────────────────
    pub fn withdraw_from_sub_account(
        ctx: Context<WithdrawFromSubAccount>,
        amount: u64,
        action_reference: String,
    ) -> Result<()> {
        require!(amount > 0, ZeroGlobalError::InvalidAmount);

        let sub = &mut ctx.accounts.sub_account;
        
        require!(
            sub.balance >= amount,
            ZeroGlobalError::InsufficientCompanyBalance
        );

        // Deduct from sub-account
        sub.balance = sub
            .balance
            .checked_sub(amount)
            .ok_or(ZeroGlobalError::ArithmeticOverflow)?;

        // Credit the company treasury
        let company = &mut ctx.accounts.company_account;
        company.treasury_balance = company
            .treasury_balance
            .checked_add(amount)
            .ok_or(ZeroGlobalError::ArithmeticOverflow)?;

        // Write TransactionLog
        let clock = Clock::get()?;
        let log = &mut ctx.accounts.transaction_log;
        log.sender_company = ctx.accounts.signer.key();
        log.recipient_wallet = company.key();
        log.amount = amount;
        log.timestamp = clock.unix_timestamp;
        log.payment_type = PaymentType::SubAccountWithdrawal;
        log.payment_reference = action_reference;
        log.bump = ctx.bumps.transaction_log;

        msg!(
            "Zero Global: Withdrew {} USDC from sub-account '{}' back to treasury",
            amount,
            sub.name
        );
        Ok(())
    }

    // ─────────────────────────────────────────────────────────
    // 9. EXTERNAL WITHDRAW FROM SUB-ACCOUNT
    //    Sends actual USDC from the sub-account's allocation 
    //    to an external wallet. Simulates a payment.
    // ─────────────────────────────────────────────────────────
    pub fn external_withdraw_from_sub_account(
        ctx: Context<ExternalWithdrawFromSubAccount>,
        amount: u64,
        action_reference: String,
    ) -> Result<()> {
        require!(amount > 0, ZeroGlobalError::InvalidAmount);
        
        // Deduct from sub-account
        let sub = &mut ctx.accounts.sub_account;
        require!(
            sub.balance >= amount,
            ZeroGlobalError::InsufficientCompanyBalance
        );
        sub.balance = sub
            .balance
            .checked_sub(amount)
            .ok_or(ZeroGlobalError::ArithmeticOverflow)?;

        // Determine bump for PDA signer
        let vault_bump = ctx.accounts.treasury_vault_state.bump;
        let seeds = &[TREASURY_VAULT_SEED, &[vault_bump]];
        let signer_seeds = &[&seeds[..]];

        // CPI: Vault -> Recipient Token Account
        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_token_account.to_account_info(),
            to: ctx.accounts.recipient_token_account.to_account_info(),
            authority: ctx.accounts.treasury_vault_state.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );
        token::transfer(cpi_ctx, amount)?;

        // Update vault global stats
        let vault = &mut ctx.accounts.treasury_vault_state;
        vault.total_payments_sent = vault
            .total_payments_sent
            .checked_add(amount)
            .ok_or(ZeroGlobalError::ArithmeticOverflow)?;

        // Write TransactionLog
        let clock = Clock::get()?;
        let log = &mut ctx.accounts.transaction_log;
        log.sender_company = ctx.accounts.signer.key();
        log.recipient_wallet = ctx.accounts.recipient_wallet.key();
        log.amount = amount;
        log.timestamp = clock.unix_timestamp;
        log.payment_type = PaymentType::SubAccountExternalPayment;
        log.payment_reference = action_reference;
        log.bump = ctx.bumps.transaction_log;

        msg!(
            "Zero Global: Paid {} USDC externally from sub-account '{}'",
            amount,
            sub.name
        );
        Ok(())
    }
}

// ============================================================
// ACCOUNT CONTEXTS
// ============================================================

// ── 1. CreateCompanyAccount ──────────────────────────────────
#[derive(Accounts)]
#[instruction(company_id: String)]
pub struct CreateCompanyAccount<'info> {
    /// The business wallet signing the transaction.
    #[account(mut)]
    pub signer: Signer<'info>,

    /// The new company PDA, derived from wallet + company_id.
    /// This ensures each wallet can only hold one account per company_id.
    #[account(
        init,
        payer = signer,
        space = CompanyAccount::LEN,
        seeds = [COMPANY_ACCOUNT_SEED, signer.key().as_ref(), company_id.as_str().as_bytes()],
        bump
    )]
    pub company_account: Account<'info, CompanyAccount>,

    pub system_program: Program<'info, System>,
}

// ── 2. InitializeTreasuryVault ───────────────────────────────
#[derive(Accounts)]
pub struct InitializeTreasuryVault<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The USDC mint — must be provided at deploy time.
    /// On mainnet: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
    pub usdc_mint: Account<'info, Mint>,

    /// The global treasury vault state PDA.
    #[account(
        init,
        payer = authority,
        space = TreasuryVaultState::LEN,
        seeds = [TREASURY_VAULT_SEED],
        bump
    )]
    pub treasury_vault_state: Account<'info, TreasuryVaultState>,

    /// The USDC token account owned by the vault state PDA.
    /// This is where all treasury USDC is held.
    #[account(
        init,
        payer = authority,
        token::mint = usdc_mint,
        token::authority = treasury_vault_state,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

// ── 3. DepositToTreasury ─────────────────────────────────────
#[derive(Accounts)]
#[instruction(amount: u64, payment_reference: String)]
pub struct DepositToTreasury<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    /// Mutable company account — must be owned by signer.
    #[account(
        mut,
        has_one = company_wallet @ ZeroGlobalError::Unauthorised,
        constraint = company_account.company_wallet == signer.key() @ ZeroGlobalError::Unauthorised
    )]
    pub company_account: Account<'info, CompanyAccount>,

    /// CHECK: validated via has_one constraint above
    pub company_wallet: UncheckedAccount<'info>,

    /// The company's USDC ATA (source of funds).
    #[account(
        mut,
        token::mint = usdc_mint,
        token::authority = signer,
    )]
    pub company_token_account: Account<'info, TokenAccount>,

    /// Global vault state PDA.
    #[account(
        mut,
        seeds = [TREASURY_VAULT_SEED],
        bump = treasury_vault_state.bump
    )]
    pub treasury_vault_state: Account<'info, TreasuryVaultState>,

    /// The vault's USDC token account (destination).
    #[account(
        mut,
        address = treasury_vault_state.vault_token_account @ ZeroGlobalError::InvalidVaultAccount
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// Immutable on-chain payment log.
    #[account(
        init,
        payer = signer,
        space = TransactionLog::LEN,
        seeds = [
            b"tx_log",
            signer.key().as_ref(),
            treasury_vault_state.vault_token_account.as_ref(), // Use vault token account as recipient seed
            payment_reference.as_str().as_bytes()
        ],
        bump
    )]
    pub transaction_log: Account<'info, TransactionLog>,

    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

// ── 4. CreatePayment ─────────────────────────────────────────
#[derive(Accounts)]
#[instruction(amount: u64, payment_reference: String)]
pub struct CreatePayment<'info> {
    /// The company owner authorising the payment.
    #[account(mut)]
    pub signer: Signer<'info>,

    /// Company account — must be owned by signer.
    #[account(
        mut,
        has_one = company_wallet @ ZeroGlobalError::Unauthorised,
        constraint = company_account.company_wallet == signer.key() @ ZeroGlobalError::Unauthorised
    )]
    pub company_account: Account<'info, CompanyAccount>,

    /// CHECK: validated via has_one
    pub company_wallet: UncheckedAccount<'info>,

    /// The recipient's public key (used for log + PDA seed).
    /// CHECK: Any valid Solana wallet — recipient chooses where to receive.
    pub recipient_wallet: UncheckedAccount<'info>,

    /// Recipient's USDC token account (must exist before payment).
    #[account(
        mut,
        token::mint = usdc_mint,
    )]
    pub recipient_token_account: Account<'info, TokenAccount>,

    /// Global vault state PDA (used as signer authority for CPI).
    #[account(
        mut,
        seeds = [TREASURY_VAULT_SEED],
        bump = treasury_vault_state.bump
    )]
    pub treasury_vault_state: Account<'info, TreasuryVaultState>,

    /// The vault's USDC token account (source of payment).
    #[account(
        mut,
        address = treasury_vault_state.vault_token_account @ ZeroGlobalError::InvalidVaultAccount
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// Immutable on-chain payment log.
    /// Seeded by sender + recipient + reference for uniqueness.
    #[account(
        init,
        payer = signer,
        space = TransactionLog::LEN,
        seeds = [
            b"tx_log",
            signer.key().as_ref(),
            recipient_wallet.key().as_ref(),
            payment_reference.as_str().as_bytes()
        ],
        bump
    )]
    pub transaction_log: Account<'info, TransactionLog>,

    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

// ── 5. WithdrawFromTreasury ──────────────────────────────────
#[derive(Accounts)]
#[instruction(amount: u64, withdrawal_reference: String)]
pub struct WithdrawFromTreasury<'info> {
    /// Must be the original company wallet owner.
    #[account(mut)]
    pub signer: Signer<'info>,

    /// Company account — strictly enforced to signer.
    #[account(
        mut,
        has_one = company_wallet @ ZeroGlobalError::Unauthorised,
        constraint = company_account.company_wallet == signer.key() @ ZeroGlobalError::Unauthorised
    )]
    pub company_account: Account<'info, CompanyAccount>,

    /// CHECK: validated via has_one
    pub company_wallet: UncheckedAccount<'info>,

    /// Company's USDC ATA to receive withdrawn funds.
    #[account(
        mut,
        token::mint = usdc_mint,
        token::authority = signer,
    )]
    pub company_token_account: Account<'info, TokenAccount>,

    /// Global vault state PDA.
    #[account(
        mut,
        seeds = [TREASURY_VAULT_SEED],
        bump = treasury_vault_state.bump
    )]
    pub treasury_vault_state: Account<'info, TreasuryVaultState>,

    /// The vault's USDC token account (source of withdrawal).
    #[account(
        mut,
        address = treasury_vault_state.vault_token_account @ ZeroGlobalError::InvalidVaultAccount
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// Immutable on-chain payment log.
    #[account(
        init,
        payer = signer,
        space = TransactionLog::LEN,
        seeds = [
            b"tx_log",
            signer.key().as_ref(), // Sender
            signer.key().as_ref(), // Recipient (self)
            withdrawal_reference.as_str().as_bytes()
        ],
        bump
    )]
    pub transaction_log: Account<'info, TransactionLog>,

    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

// ── 6. CreateSubAccount ──────────────────────────────────────
#[derive(Accounts)]
#[instruction(name: String, action_reference: String)]
pub struct CreateSubAccount<'info> {
    /// The company owner signing the transaction.
    #[account(mut)]
    pub signer: Signer<'info>,

    /// The parent company account — must be owned by signer.
    #[account(
        mut,
        constraint = company_account.company_wallet == signer.key() @ ZeroGlobalError::Unauthorised
    )]
    pub company_account: Account<'info, CompanyAccount>,

    /// The new sub-account PDA.
    /// Seeded by [sub_account, company_wallet, name] for global uniqueness.
    #[account(
        init,
        payer = signer,
        space = SubAccount::LEN,
        seeds = [SUB_ACCOUNT_SEED, signer.key().as_ref(), name.as_str().as_bytes()],
        bump
    )]
    pub sub_account: Account<'info, SubAccount>,

    /// Immutable on-chain payment log.
    #[account(
        init,
        payer = signer,
        space = TransactionLog::LEN,
        seeds = [
            b"tx_log",
            signer.key().as_ref(), // Sender
            signer.key().as_ref(), // Recipient (self)
            action_reference.as_str().as_bytes()
        ],
        bump
    )]
    pub transaction_log: Account<'info, TransactionLog>,

    pub system_program: Program<'info, System>,
}

// ── 7. FundSubAccount ────────────────────────────────────────
#[derive(Accounts)]
#[instruction(amount: u64, action_reference: String)]
pub struct FundSubAccount<'info> {
    /// The company owner authorising the fund transfer.
    #[account(mut)]
    pub signer: Signer<'info>,

    /// The company account (source of funds).
    /// Enforced to be owned by the signer.
    #[account(
        mut,
        constraint = company_account.company_wallet == signer.key() @ ZeroGlobalError::Unauthorised
    )]
    pub company_account: Account<'info, CompanyAccount>,

    /// The sub-account to receive the allocation.
    /// Must be owned by the same wallet.
    #[account(
        mut,
        constraint = sub_account.owner == signer.key() @ ZeroGlobalError::Unauthorised
    )]
    pub sub_account: Account<'info, SubAccount>,

    /// Immutable on-chain payment log.
    #[account(
        init,
        payer = signer,
        space = TransactionLog::LEN,
        seeds = [
            b"tx_log",
            signer.key().as_ref(), // Sender
            signer.key().as_ref(), // Recipient (self)
            action_reference.as_str().as_bytes()
        ],
        bump
    )]
    pub transaction_log: Account<'info, TransactionLog>,

    pub system_program: Program<'info, System>,
}

// ── 8. WithdrawFromSubAccount ────────────────────────────────
#[derive(Accounts)]
#[instruction(amount: u64, action_reference: String)]
pub struct WithdrawFromSubAccount<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        constraint = company_account.company_wallet == signer.key() @ ZeroGlobalError::Unauthorised
    )]
    pub company_account: Account<'info, CompanyAccount>,

    #[account(
        mut,
        constraint = sub_account.owner == signer.key() @ ZeroGlobalError::Unauthorised
    )]
    pub sub_account: Account<'info, SubAccount>,

    #[account(
        init,
        payer = signer,
        space = TransactionLog::LEN,
        seeds = [
            b"tx_log",
            signer.key().as_ref(), // Sender
            signer.key().as_ref(), // Recipient (self)
            action_reference.as_str().as_bytes()
        ],
        bump
    )]
    pub transaction_log: Account<'info, TransactionLog>,

    pub system_program: Program<'info, System>,
}

// ── 9. ExternalWithdrawFromSubAccount ─────────────────────────
#[derive(Accounts)]
#[instruction(amount: u64, action_reference: String)]
pub struct ExternalWithdrawFromSubAccount<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        constraint = company_account.company_wallet == signer.key() @ ZeroGlobalError::Unauthorised
    )]
    pub company_account: Account<'info, CompanyAccount>,

    #[account(
        mut,
        constraint = sub_account.owner == signer.key() @ ZeroGlobalError::Unauthorised
    )]
    pub sub_account: Account<'info, SubAccount>,

    /// CHECK: The external recipient wallet.
    pub recipient_wallet: UncheckedAccount<'info>,

    /// Recipient's USDC token account.
    #[account(mut)]
    pub recipient_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [TREASURY_VAULT_SEED],
        bump = treasury_vault_state.bump
    )]
    pub treasury_vault_state: Account<'info, TreasuryVaultState>,

    #[account(
        mut,
        address = treasury_vault_state.vault_token_account @ ZeroGlobalError::InvalidVaultAccount
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = signer,
        space = TransactionLog::LEN,
        seeds = [
            b"tx_log",
            signer.key().as_ref(), // Sender
            recipient_wallet.key().as_ref(), // Recipient
            action_reference.as_str().as_bytes()
        ],
        bump
    )]
    pub transaction_log: Account<'info, TransactionLog>,

    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

// ============================================================
// ACCOUNT STRUCTS
// ============================================================

/// Stores per-company registration data and treasury balance.
#[account]
#[derive(Default)]
pub struct CompanyAccount {
    /// The Solana wallet that owns this company account.
    pub company_wallet: Pubkey,          // 32
    /// Unique business identifier (max 64 chars).
    pub company_id: String,              // 4 + 64
    /// USDC balance held in the shared vault on behalf of this company.
    /// Denominated in USDC base units (6 decimals).
    pub treasury_balance: u64,           // 8
    /// Unix timestamp of account creation.
    pub created_at: i64,                 // 8
    /// PDA bump seed.
    pub bump: u8,                        // 1
}

impl CompanyAccount {
    /// Total on-chain space for this account.
    pub const LEN: usize = 8   // discriminator
        + 32                   // company_wallet
        + (4 + 64)             // company_id string
        + 8                    // treasury_balance
        + 8                    // created_at
        + 1;                   // bump
}

/// Global singleton PDA that tracks vault statistics.
/// The vault_token_account is the actual USDC holder.
#[account]
#[derive(Default)]
pub struct TreasuryVaultState {
    /// The USDC mint address this vault accepts.
    pub usdc_mint: Pubkey,               // 32
    /// The SPL TokenAccount holding all treasury USDC.
    pub vault_token_account: Pubkey,     // 32
    /// Total USDC ever deposited (lifetime).
    pub total_deposited: u64,            // 8
    /// Total USDC ever withdrawn back to companies.
    pub total_withdrawn: u64,            // 8
    /// Total USDC ever sent as payments.
    pub total_payments_sent: u64,        // 8
    /// PDA bump seed.
    pub bump: u8,                        // 1
}

impl TreasuryVaultState {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 8 + 1;
}

/// Immutable on-chain record created for every payment instruction.
#[account]
#[derive(Default)]
pub struct TransactionLog {
    /// The company wallet that initiated the payment.
    pub sender_company: Pubkey,          // 32
    /// The wallet that received the USDC.
    pub recipient_wallet: Pubkey,        // 32
    /// Amount transferred in USDC base units.
    pub amount: u64,                     // 8
    /// Unix timestamp of the transaction.
    pub timestamp: i64,                  // 8
    /// Type of payment (cross-border, etc.).
    pub payment_type: PaymentType,       // 1
    /// Arbitrary reference string for reconciliation.
    pub payment_reference: String,       // 4 + 64
    /// PDA bump seed.
    pub bump: u8,                        // 1
}

/// Named sub-account belonging to a company, holding a
/// portion of the company's treasury allocation.
#[account]
#[derive(Default)]
pub struct SubAccount {
    /// The company wallet that owns this sub-account.
    pub owner: Pubkey,              // 32
    /// The parent CompanyAccount PDA.
    pub company_account: Pubkey,    // 32
    /// Human-readable name (3–32 chars).
    pub name: String,               // 4 + 32
    /// USDC balance allocated to this sub-account (base units).
    pub balance: u64,               // 8
    /// Unix timestamp of creation.
    pub created_at: i64,            // 8
    /// PDA bump seed.
    pub bump: u8,                   // 1
}

impl SubAccount {
    pub const LEN: usize = 8   // discriminator
        + 32                   // owner
        + 32                   // company_account
        + (4 + 32)             // name string
        + 8                    // balance
        + 8                    // created_at
        + 1;                   // bump
}

impl TransactionLog {
    pub const LEN: usize = 8   // discriminator
        + 32                   // sender_company
        + 32                   // recipient_wallet
        + 8                    // amount
        + 8                    // timestamp
        + 1                    // payment_type
        + (4 + 64)             // payment_reference
        + 1;                   // bump
}

// ============================================================
// ENUMS
// ============================================================

/// Classifies the nature of a treasury payment.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Default)]
pub enum PaymentType {
    #[default]
    CrossBorder,
    Domestic,
    Refund,
    Settlement,
    Deposit,
    Withdrawal,
    SubAccountCreated,
    SubAccountFunded,
    SubAccountWithdrawal,
    SubAccountExternalPayment,
}

// ============================================================
// EVENTS — emitted for off-chain indexers / Zero Mobile
// ============================================================

#[event]
pub struct CompanyRegistered {
    pub company_wallet: Pubkey,
    pub company_id: String,
    pub created_at: i64,
}

#[event]
pub struct TreasuryDeposit {
    pub company_wallet: Pubkey,
    pub amount: u64,
    pub new_balance: u64,
}

#[event]
pub struct PaymentSent {
    pub sender_company: Pubkey,
    pub recipient_wallet: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
    pub payment_reference: String,
}

#[event]
pub struct TreasuryWithdrawal {
    pub company_wallet: Pubkey,
    pub amount: u64,
    pub remaining_balance: u64,
}

#[event]
pub struct SubAccountCreated {
    pub company_wallet: Pubkey,
    pub name: String,
    pub created_at: i64,
}

#[event]
pub struct SubAccountFunded {
    pub company_wallet: Pubkey,
    pub sub_account_name: String,
    pub amount: u64,
    pub new_sub_balance: u64,
    pub remaining_company_balance: u64,
}

// ============================================================
// ERRORS
// ============================================================

#[error_code]
pub enum ZeroGlobalError {
    #[msg("Unauthorised: signer is not the company wallet owner.")]
    Unauthorised,
    #[msg("Insufficient treasury balance for this operation.")]
    InsufficientTreasuryBalance,
    #[msg("Amount must be greater than zero.")]
    InvalidAmount,
    #[msg("Company ID must be between 3 and 64 characters.")]
    InvalidCompanyId,
    #[msg("Payment reference must be 64 characters or fewer.")]
    InvalidReference,
    #[msg("Payment reference exceeds 64 bytes.")]
    ReferenceTooLong,
    #[msg("Arithmetic overflow detected.")]
    ArithmeticOverflow,
    #[msg("Provided vault token account does not match the treasury vault.")]
    InvalidVaultAccount,
    #[msg("Sub-account name must be at least 3 characters.")]
    SubAccountNameTooShort,
    #[msg("Sub-account name must be 32 characters or fewer.")]
    SubAccountNameTooLong,
    #[msg("Insufficient company treasury balance to fund this sub-account.")]
    InsufficientCompanyBalance,
}