/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Keypair } from "@solana/web3.js";
import {
    getAssociatedTokenAddress,
    TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
    USDC_MINT_DEVNET,
    TREASURY_VAULT_SEED,
    COMPANY_ACCOUNT_SEED,
    TX_LOG_SEED,
    SUB_ACCOUNT_SEED,
    PROGRAM_ID,
} from "../utils/constants";
import idl from "../idl/zero_global_treasury.json";

// Typed accessor so program.account.xxx calls don't error in strict mode
type AnchorAccounts = {
    companyAccount: { all: (f: any[]) => Promise<any[]>; fetch: (k: PublicKey) => Promise<any> };
    treasuryVaultState: { all: (f: any[]) => Promise<any[]>; fetch: (k: PublicKey) => Promise<any> };
    transactionLog: { all: (f: any[]) => Promise<any[]>; fetch: (k: PublicKey) => Promise<any> };
    subAccount: { all: (f: any[]) => Promise<any[]>; fetch: (k: PublicKey) => Promise<any> };
};

// ── Types ──────────────────────────────────────────────────────
export interface CompanyAccountData {
    companyWallet: PublicKey;
    companyId: string;
    treasuryBalance: bigint;
    createdAt: bigint;
    bump: number;
}

export interface VaultStateData {
    usdcMint: PublicKey;
    vaultTokenAccount: PublicKey;
    totalDeposited: bigint;
    totalWithdrawn: bigint;
    totalPaymentsSent: bigint;
    bump: number;
}

export interface TxLogData {
    senderCompany: PublicKey;
    recipientWallet: PublicKey;
    amount: bigint;
    timestamp: bigint;
    paymentType: Record<string, Record<string, never>>;
    paymentReference: string;
    bump: number;
    publicKey: PublicKey;
}

export interface SubAccountData {
    owner: PublicKey;
    companyAccount: PublicKey;
    name: string;
    balance: bigint;
    createdAt: bigint;
    bump: number;
    publicKey: PublicKey;
}

// ── Hook ───────────────────────────────────────────────────────
export function useZeroGlobal() {
    const { connection } = useConnection();
    const wallet = useWallet();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [program, setProgram] = useState<Program<any> | null>(null);
    const [companyAccount, setCompanyAccount] =
        useState<CompanyAccountData | null>(null);
    const [vaultState, setVaultState] = useState<VaultStateData | null>(null);
    const [transactionLogs, setTransactionLogs] = useState<TxLogData[]>([]);
    const [subAccounts, setSubAccounts] = useState<SubAccountData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const usdcMint = USDC_MINT_DEVNET;

    // ── Initialise Anchor program ─────────────────────────────
    useEffect(() => {
        if (!wallet.publicKey || !wallet.signTransaction) return;
        const provider = new AnchorProvider(connection, wallet as never, {
            commitment: "confirmed",
        });
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const prog = new Program(idl as any, PROGRAM_ID, provider);
            setProgram(prog);
        } catch (err) {
            console.error("Anchor Program init failed:", err);
        }
    }, [connection, wallet.publicKey, wallet.signTransaction]);

    // ── PDA helpers ───────────────────────────────────────────
    const getTreasuryVaultPDA = useCallback(() => {
        const [pda] = PublicKey.findProgramAddressSync(
            [TREASURY_VAULT_SEED],
            PROGRAM_ID
        );
        return pda;
    }, []);

    const getCompanyAccountPDA = useCallback(
        (signerKey: PublicKey, companyId: string) => {
            const [pda] = PublicKey.findProgramAddressSync(
                [
                    COMPANY_ACCOUNT_SEED,
                    signerKey.toBuffer(),
                    Buffer.from(companyId),
                ],
                PROGRAM_ID
            );
            return pda;
        },
        []
    );

    const getSubAccountPDA = useCallback(
        (signerKey: PublicKey, name: string) => {
            const [pda] = PublicKey.findProgramAddressSync(
                [
                    SUB_ACCOUNT_SEED,
                    signerKey.toBuffer(),
                    Buffer.from(name),
                ],
                PROGRAM_ID
            );
            return pda;
        },
        []
    );

    // ── Fetch on-chain data ───────────────────────────────────
    const fetchCompanyAccount = useCallback(async () => {
        if (!program || !wallet.publicKey) return;
        try {
            const accts = (program.account as unknown as AnchorAccounts);
            const accounts = await accts.companyAccount.all([
                {
                    memcmp: {
                        offset: 8, // skip discriminator
                        bytes: wallet.publicKey.toBase58(),
                    },
                },
            ]);
            if (accounts.length > 0) {
                const acc = accounts[0].account;
                setCompanyAccount({
                    companyWallet: acc.companyWallet,
                    companyId: acc.companyId,
                    treasuryBalance: BigInt(acc.treasuryBalance.toString()),
                    createdAt: BigInt(acc.createdAt.toString()),
                    bump: acc.bump,
                });
            } else {
                setCompanyAccount(null);
            }
        } catch (e) {
            console.error("fetchCompanyAccount:", e);
        }
    }, [program, wallet.publicKey]);

    const fetchVaultState = useCallback(async () => {
        if (!program) return;
        try {
            const vaultPDA = await getTreasuryVaultPDA();
            const acc = await (program.account as unknown as AnchorAccounts).treasuryVaultState.fetch(vaultPDA);
            setVaultState({
                usdcMint: acc.usdcMint,
                vaultTokenAccount: acc.vaultTokenAccount,
                totalDeposited: BigInt(acc.totalDeposited.toString()),
                totalWithdrawn: BigInt(acc.totalWithdrawn.toString()),
                totalPaymentsSent: BigInt(acc.totalPaymentsSent.toString()),
                bump: acc.bump,
            });
        } catch (e) {
            // Vault not yet initialized
            setVaultState(null);
        }
    }, [program, getTreasuryVaultPDA]);

    const fetchTransactionLogs = useCallback(async () => {
        if (!program || !wallet.publicKey) return;
        try {
            const logs = await (program.account as unknown as AnchorAccounts).transactionLog.all([
                {
                    memcmp: {
                        offset: 8,
                        bytes: wallet.publicKey.toBase58(),
                    },
                },
            ]);
            const parsed = logs.map((l: any) => ({
                senderCompany: l.account.senderCompany,
                recipientWallet: l.account.recipientWallet,
                amount: BigInt(l.account.amount.toString()),
                timestamp: BigInt(l.account.timestamp.toString()),
                paymentType: l.account.paymentType,
                paymentReference: l.account.paymentReference,
                bump: l.account.bump,
                publicKey: l.publicKey,
            }));
            // Sort newest first
            parsed.sort((a: any, b: any) => Number(b.timestamp - a.timestamp));
            setTransactionLogs(parsed);
        } catch (e) {
            console.error("fetchTransactionLogs:", e);
        }
    }, [program, wallet.publicKey]);

    const fetchSubAccounts = useCallback(async () => {
        if (!program || !wallet.publicKey) return;
        try {
            const accounts = await (program.account as unknown as AnchorAccounts).subAccount.all([
                {
                    memcmp: {
                        offset: 8, // skip discriminator — owner is first field
                        bytes: wallet.publicKey.toBase58(),
                    },
                },
            ]);
            const parsed = accounts.map((a: any) => ({
                owner: a.account.owner,
                companyAccount: a.account.companyAccount,
                name: a.account.name,
                balance: BigInt(a.account.balance.toString()),
                createdAt: BigInt(a.account.createdAt.toString()),
                bump: a.account.bump,
                publicKey: a.publicKey,
            }));
            // Sort alphabetically by name
            parsed.sort((a: any, b: any) => a.name.localeCompare(b.name));
            setSubAccounts(parsed);
        } catch (e) {
            console.error("fetchSubAccounts:", e);
        }
    }, [program, wallet.publicKey]);

    const refreshAll = useCallback(async () => {
        await Promise.all([
            fetchCompanyAccount(),
            fetchVaultState(),
            fetchTransactionLogs(),
            fetchSubAccounts(),
        ]);
    }, [fetchCompanyAccount, fetchVaultState, fetchTransactionLogs, fetchSubAccounts]);

    useEffect(() => {
        if (program && wallet.publicKey) {
            refreshAll();
        }
    }, [program, wallet.publicKey, refreshAll]);

    // ── Instructions ──────────────────────────────────────────

    /** 0. Initialize the treasury vault. */
    const initializeVault = useCallback(async () => {
        if (!wallet.publicKey) throw new Error("Wallet not connected");
        if (!program) throw new Error("Program not initialized (check console for Anchor init failure)");
        setLoading(true);
        setError(null);
        try {
            const vaultPDA = await getTreasuryVaultPDA();
            const vaultTokenKeypair = Keypair.generate();

            await program.methods
                .initializeTreasuryVault()
                .accountsStrict({
                    authority: wallet.publicKey,
                    usdcMint,
                    treasuryVaultState: vaultPDA,
                    vaultTokenAccount: vaultTokenKeypair.publicKey,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                    rent: SYSVAR_RENT_PUBKEY,
                })
                .signers([vaultTokenKeypair])
                .rpc();
            await refreshAll();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            setError(msg);
            throw e;
        } finally {
            setLoading(false);
        }
    }, [program, wallet.publicKey, getTreasuryVaultPDA, usdcMint, refreshAll]);

    /** 1. Register a company with the Zero Global treasury. */
    const registerCompany = useCallback(
        async (companyId: string) => {
            if (!wallet.publicKey) throw new Error("Wallet not connected");
            if (!program) throw new Error("Program not initialized");
            setLoading(true);
            setError(null);
            try {
                const companyAccountPDA = await getCompanyAccountPDA(
                    wallet.publicKey,
                    companyId
                );
                await program.methods
                    .createCompanyAccount(companyId)
                    .accountsStrict({
                        signer: wallet.publicKey,
                        companyAccount: companyAccountPDA,
                        systemProgram: SystemProgram.programId,
                    })
                    .rpc();
                await refreshAll();
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                setError(msg);
                throw e;
            } finally {
                setLoading(false);
            }
        },
        [program, wallet.publicKey, getCompanyAccountPDA, refreshAll]
    );

    /** 2. Deposit USDC into the treasury vault. */
    const deposit = useCallback(
        async (amount: number) => {
            if (!wallet.publicKey) throw new Error("Wallet not connected");
            if (!program || !companyAccount || !vaultState) throw new Error("Program or account state not ready");
            setLoading(true);
            setError(null);
            try {
                const vaultPDA = await getTreasuryVaultPDA();
                const companyAccountPDA = await getCompanyAccountPDA(
                    wallet.publicKey,
                    companyAccount.companyId
                );
                const companyTokenAccount = await getAssociatedTokenAddress(
                    usdcMint,
                    wallet.publicKey
                );
                const baseUnits = new BN(
                    Math.floor(amount * Math.pow(10, 6)).toString()
                );

                const depositId = `dep-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

                const [txLogPDA] = PublicKey.findProgramAddressSync(
                    [
                        TX_LOG_SEED,
                        wallet.publicKey.toBuffer(),
                        vaultState.vaultTokenAccount.toBuffer(),
                        Buffer.from(depositId),
                    ],
                    PROGRAM_ID
                );


                await program.methods
                    .depositToTreasury(baseUnits, depositId)
                    .accountsStrict({
                        signer: wallet.publicKey,
                        companyAccount: companyAccountPDA,
                        companyWallet: wallet.publicKey,
                        companyTokenAccount,
                        treasuryVaultState: vaultPDA,
                        vaultTokenAccount: vaultState.vaultTokenAccount,
                        transactionLog: txLogPDA,
                        usdcMint,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        systemProgram: SystemProgram.programId,
                    })
                    .rpc();
                await refreshAll();
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                setError(msg);
                throw e;
            } finally {
                setLoading(false);
            }
        },
        [
            program,
            wallet.publicKey,
            companyAccount,
            vaultState,
            getTreasuryVaultPDA,
            getCompanyAccountPDA,
            usdcMint,
            refreshAll,
        ]
    );

    /** 3. Send a cross-border USDC payment. */
    const sendPayment = useCallback(
        async (recipientWallet: string, amount: number, paymentReference: string) => {
            if (!wallet.publicKey) throw new Error("Wallet not connected");
            if (!program || !companyAccount || !vaultState) throw new Error("Program or account state not ready");
            setLoading(true);
            setError(null);
            try {
                const recipientPubkey = new PublicKey(recipientWallet);
                const vaultPDA = await getTreasuryVaultPDA();
                const companyAccountPDA = await getCompanyAccountPDA(
                    wallet.publicKey,
                    companyAccount.companyId
                );
                const recipientTokenAccount = await getAssociatedTokenAddress(
                    usdcMint,
                    recipientPubkey
                );
                const baseUnits = new BN(
                    Math.round(amount * Math.pow(10, 6)).toString()
                );
                const [txLogPDA] = PublicKey.findProgramAddressSync(
                    [
                        TX_LOG_SEED,
                        wallet.publicKey.toBuffer(),
                        recipientPubkey.toBuffer(),
                        Buffer.from(paymentReference),
                    ],
                    PROGRAM_ID
                );
                await program.methods
                    .createPayment(baseUnits, paymentReference)
                    .accountsStrict({
                        signer: wallet.publicKey,
                        companyAccount: companyAccountPDA,
                        companyWallet: wallet.publicKey,
                        recipientWallet: recipientPubkey,
                        recipientTokenAccount,
                        treasuryVaultState: vaultPDA,
                        vaultTokenAccount: vaultState.vaultTokenAccount,
                        transactionLog: txLogPDA,
                        usdcMint,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        systemProgram: SystemProgram.programId,
                    })
                    .rpc();
                await refreshAll();
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                setError(msg);
                throw e;
            } finally {
                setLoading(false);
            }
        },
        [
            program,
            wallet.publicKey,
            companyAccount,
            vaultState,
            getTreasuryVaultPDA,
            getCompanyAccountPDA,
            usdcMint,
            refreshAll,
        ]
    );

    /** 4. Withdraw USDC back to the company wallet. */
    const withdraw = useCallback(
        async (amount: number) => {
            if (!wallet.publicKey) throw new Error("Wallet not connected");
            if (!program || !companyAccount || !vaultState) throw new Error("Program or account state not ready");
            setLoading(true);
            setError(null);
            try {
                const vaultPDA = await getTreasuryVaultPDA();
                const companyAccountPDA = await getCompanyAccountPDA(
                    wallet.publicKey,
                    companyAccount.companyId
                );
                const companyTokenAccount = await getAssociatedTokenAddress(
                    usdcMint,
                    wallet.publicKey
                );
                const baseUnits = new BN(
                    Math.round(amount * Math.pow(10, 6)).toString()
                );
                const withdrawId = `wdr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

                const [txLogPDA] = PublicKey.findProgramAddressSync(
                    [
                        TX_LOG_SEED,
                        wallet.publicKey.toBuffer(),
                        wallet.publicKey.toBuffer(),
                        Buffer.from(withdrawId),
                    ],
                    PROGRAM_ID
                );
                await program.methods
                    .withdrawFromTreasury(baseUnits, withdrawId)
                    .accountsStrict({
                        signer: wallet.publicKey,
                        companyAccount: companyAccountPDA,
                        companyWallet: wallet.publicKey,
                        companyTokenAccount,
                        treasuryVaultState: vaultPDA,
                        vaultTokenAccount: vaultState.vaultTokenAccount,
                        transactionLog: txLogPDA,
                        usdcMint,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        systemProgram: SystemProgram.programId,
                    })
                    .rpc();
                await refreshAll();
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                setError(msg);
                throw e;
            } finally {
                setLoading(false);
            }
        },
        [
            program,
            wallet.publicKey,
            companyAccount,
            vaultState,
            getTreasuryVaultPDA,
            getCompanyAccountPDA,
            usdcMint,
            refreshAll,
        ]
    );

    /** 5. Create a named sub-account under the company. */
    const createSubAccount = useCallback(
        async (name: string) => {
            if (!wallet.publicKey) throw new Error("Wallet not connected");
            if (!program || !companyAccount) throw new Error("Program or company account not ready");
            setLoading(true);
            setError(null);
            try {
                const companyAccountPDA = getCompanyAccountPDA(
                    wallet.publicKey,
                    companyAccount.companyId
                );
                const subAccountPDA = getSubAccountPDA(wallet.publicKey, name);
                const actionRef = `csa-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

                const [txLogPDA] = PublicKey.findProgramAddressSync(
                    [
                        TX_LOG_SEED,
                        wallet.publicKey.toBuffer(),
                        wallet.publicKey.toBuffer(),
                        Buffer.from(actionRef),
                    ],
                    PROGRAM_ID
                );

                await program.methods
                    .createSubAccount(name, actionRef)
                    .accountsStrict({
                        signer: wallet.publicKey,
                        companyAccount: companyAccountPDA,
                        subAccount: subAccountPDA,
                        transactionLog: txLogPDA,
                        systemProgram: SystemProgram.programId,
                    })
                    .rpc();
                await refreshAll();
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                setError(msg);
                throw e;
            } finally {
                setLoading(false);
            }
        },
        [program, wallet.publicKey, companyAccount, getCompanyAccountPDA, getSubAccountPDA, refreshAll]
    );

    /** 6. Move USDC allocation from company treasury balance into a sub-account. */
    const fundSubAccount = useCallback(
        async (subAccountName: string, amount: number) => {
            if (!wallet.publicKey) throw new Error("Wallet not connected");
            if (!program || !companyAccount) throw new Error("Program or company account not ready");
            setLoading(true);
            setError(null);
            try {
                const companyAccountPDA = getCompanyAccountPDA(
                    wallet.publicKey,
                    companyAccount.companyId
                );
                const subAccountPDA = getSubAccountPDA(wallet.publicKey, subAccountName);
                const baseUnits = new BN(
                    Math.round(amount * Math.pow(10, 6)).toString()
                );
                const actionRef = `fsa-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

                const [txLogPDA] = PublicKey.findProgramAddressSync(
                    [
                        TX_LOG_SEED,
                        wallet.publicKey.toBuffer(),
                        wallet.publicKey.toBuffer(),
                        Buffer.from(actionRef),
                    ],
                    PROGRAM_ID
                );

                await program.methods
                    .fundSubAccount(baseUnits, actionRef)
                    .accountsStrict({
                        signer: wallet.publicKey,
                        companyAccount: companyAccountPDA,
                        subAccount: subAccountPDA,
                        transactionLog: txLogPDA,
                        systemProgram: SystemProgram.programId,
                    })
                    .rpc();
                await refreshAll();
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                setError(msg);
                throw e;
            } finally {
                setLoading(false);
            }
        },
        [program, wallet.publicKey, companyAccount, getCompanyAccountPDA, getSubAccountPDA, refreshAll]
    );

    /** 7. Withdraw USDC from a sub-account back to the main treasury. */
    const withdrawFromSubAccount = useCallback(
        async (subAccountName: string, amount: number) => {
            if (!wallet.publicKey) throw new Error("Wallet not connected");
            if (!program || !companyAccount) throw new Error("Program or company account not ready");
            setLoading(true);
            setError(null);
            try {
                const companyAccountPDA = getCompanyAccountPDA(
                    wallet.publicKey,
                    companyAccount.companyId
                );
                const subAccountPDA = getSubAccountPDA(wallet.publicKey, subAccountName);
                const baseUnits = new BN(
                    Math.round(amount * Math.pow(10, 6)).toString()
                );
                const actionRef = `wsa-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

                const [txLogPDA] = PublicKey.findProgramAddressSync(
                    [
                        TX_LOG_SEED,
                        wallet.publicKey.toBuffer(),
                        wallet.publicKey.toBuffer(),
                        Buffer.from(actionRef),
                    ],
                    PROGRAM_ID
                );

                await program.methods
                    .withdrawFromSubAccount(baseUnits, actionRef)
                    .accountsStrict({
                        signer: wallet.publicKey,
                        companyAccount: companyAccountPDA,
                        subAccount: subAccountPDA,
                        transactionLog: txLogPDA,
                        systemProgram: SystemProgram.programId,
                    })
                    .rpc();
                await refreshAll();
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                setError(msg);
                throw e;
            } finally {
                setLoading(false);
            }
        },
        [program, wallet.publicKey, companyAccount, getCompanyAccountPDA, getSubAccountPDA, refreshAll]
    );

    return {
        program,
        companyAccount,
        vaultState,
        transactionLogs,
        subAccounts,
        loading,
        error,
        initializeVault,
        registerCompany,
        deposit,
        sendPayment,
        withdraw,
        createSubAccount,
        fundSubAccount,
        withdrawFromSubAccount,
        refreshAll,
        usdcMint,
        SYSVAR_RENT_PUBKEY,
    };
}
