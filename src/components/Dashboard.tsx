import React, { useState } from "react";
import type { VaultStateData, CompanyAccountData, TxLogData, SubAccountData } from "../hooks/useZeroGlobal";
import { formatUsdc } from "../utils/formatters";
import { Inbox, Globe, Upload, AlertCircle, RefreshCw, LayoutDashboard, BarChart2 } from "lucide-react";
import { TransactionHistory } from "./TransactionHistory";
import { SubAccountsTable } from "./SubAccountsTable";
import { CreateSubAccountModal } from "./CreateSubAccountModal";
import { FundSubAccountModal } from "./FundSubAccountModal";
import { WithdrawSubAccountModal } from "./WithdrawSubAccountModal";
import { StatsSidebar } from "./StatsSidebar";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletButton } from "./WalletButton";

interface DashboardProps {
    vaultState: VaultStateData | null;
    companyAccount: CompanyAccountData | null;
    transactionLogs: TxLogData[];
    subAccounts: SubAccountData[];
    onRefresh: () => void;
    loading: boolean;
    onInitialize?: () => Promise<void>;
    onNavigate?: (tab: string) => void;
    onCreateSubAccount: (name: string) => Promise<void>;
    onFundSubAccount: (name: string, amount: number) => Promise<void>;
    onWithdrawSubAccount: (name: string, amount: number) => Promise<void>;
}

interface StatCardProps {
    label: string;
    value: string;
    icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon }) => (
    <div className="flex flex-col gap-2 p-4
                  bg-[#f6f6f6] rounded-xl flex-1">
        <div className="flex items-center gap-2">
            <div className="text-gray-600 shrink-0">
                {icon}
            </div>
            <p className="text-[0.7rem] font-bold text-gray-500 uppercase tracking-widest">{label}</p>
        </div>
        <div>
            <p className="text-[1.15rem] font-bold text-gray-900 truncate leading-none">{value}</p>
        </div>
    </div>
);

// Skeleton shimmer block
const Skeleton: React.FC<{ className?: string }> = ({ className = "" }) => (
    <div className={`animate-pulse bg-gray-300/60 rounded-lg ${className}`} />
);

const StatCardSkeleton: React.FC = () => (
    <div className="flex flex-col gap-2 p-4 bg-[#f6f6f6] rounded-xl flex-1">
        <Skeleton className="h-3 w-20 mb-1" />
        <Skeleton className="h-6 w-24" />
    </div>
);

// Mobile banner
const MobileBanner: React.FC = () => (
    <div className="flex md:hidden items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 shadow-sm">
        <span className="text-2xl shrink-0">🖥️</span>
        <div>
            <p className="font-bold text-amber-900 text-sm">Best viewed on desktop</p>
            <p className="text-amber-700 text-xs leading-relaxed mt-0.5">This dashboard is optimised for larger screens. Some features may be limited on mobile.</p>
        </div>
    </div>
);

export const Dashboard: React.FC<DashboardProps> = ({
    vaultState, companyAccount, transactionLogs, subAccounts,
    onRefresh, loading, onInitialize, onNavigate,
    onCreateSubAccount, onFundSubAccount, onWithdrawSubAccount
}) => {
    const { connected } = useWallet();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [fundModalTarget, setFundModalTarget] = useState<string | null>(null);
    const [withdrawModalTarget, setWithdrawModalTarget] = useState<string | null>(null);
    const [isStatsOpen, setIsStatsOpen] = useState(false);

    if (!connected) {
        return (
            <div className="flex flex-col items-center justify-center p-10 bg-white border border-gray-200 rounded-[2rem] shadow-sm mt-10 max-w-2xl mx-auto text-center gap-6">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                    <LayoutDashboard className="text-gray-400" size={32} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
                    <p className="text-gray-500 font-medium">Please connect your Solana wallet to access the Zero Global Treasury dashboard and features.</p>
                </div>
                <WalletButton />
            </div>
        );
    }

    const myBalance = companyAccount ? formatUsdc(companyAccount.treasuryBalance) : "—";
    const totalDeposited = vaultState ? formatUsdc(vaultState.totalDeposited) : "—";
    const totalPayments = vaultState ? formatUsdc(vaultState.totalPaymentsSent) : "—";
    const totalWithdrawn = vaultState ? formatUsdc(vaultState.totalWithdrawn) : "—";

    return (
        <div>
            {/* Mobile banner */}
            <MobileBanner />

            {/* Header */}
            <div className="flex items-start justify-between mb-8 gap-4">
                <div>
                    <h2 className="text-[1.6rem] font-extrabold mb-1 text-gray-900 tracking-tight">Treasury Overview</h2>
                    <p className="text-[0.9rem] text-gray-500 font-medium">
                        {companyAccount ? `Company ID: ${companyAccount.companyId}` : "Register your company to get started"}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsStatsOpen(true)}
                        className="flex items-center gap-2 shrink-0
                         bg-white text-gray-700 border border-gray-200 rounded-lg shadow-sm
                         px-4 py-2.5 text-[0.83rem] font-bold
                         hover:bg-gray-50 hover:text-gray-900 transition-colors duration-150"
                    >
                        <BarChart2 size={16} />
                        Stats Overview
                    </button>
                    <button
                        onClick={onRefresh}
                        disabled={loading}
                        className="flex items-center gap-2 shrink-0
                         bg-black text-white rounded-lg shadow-sm
                         px-4 py-2.5 text-[0.83rem] font-bold
                         hover:bg-gray-800 disabled:opacity-40
                         transition-colors duration-150"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                        {loading ? "Refreshing..." : "Refresh"}
                    </button>
                </div>
            </div>

            {/* Main Card */}
            <div className="bg-[#ebebeb] rounded-2xl p-8 mb-8 flex flex-col gap-8 ml-4 md:ml-8">
                {/* Top Row: Balance & Buttons */}
                <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                    <div>
                        <p className="text-[0.8rem] font-bold text-gray-500 uppercase tracking-widest mb-2">Treasury Balance</p>
                        <div className="flex items-center gap-2">
                            {loading ? (
                                <div className="animate-pulse bg-gray-300/60 rounded-xl h-12 w-52" />
                            ) : (
                                <>
                                    <h2 className="text-5xl font-extrabold text-gray-900 tracking-tight font-sans">${myBalance}</h2>
                                    <img src="/usdc-logo.png" alt="USDC" className="w-8 h-8 object-contain mt-1" />
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 shrink-0">
                        <button onClick={() => onNavigate?.("deposit")} className="bg-black text-white py-2.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors">
                            <Inbox size={16} /> Deposit
                        </button>
                        <button onClick={() => onNavigate?.("withdraw")} className="bg-black text-white py-2.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors">
                            <Upload size={16} /> Withdraw
                        </button>
                        <button onClick={() => onNavigate?.("pay")} className="bg-black text-white py-2.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors">
                            <Globe size={16} /> Pay
                        </button>
                    </div>
                </div>

                {/* Bottom Row: Stats */}
                <div className="flex md:flex-row flex-col items-stretch gap-3 w-full max-w-xl">
                    {loading ? (
                        <>
                            <StatCardSkeleton />
                            <StatCardSkeleton />
                            <StatCardSkeleton />
                        </>
                    ) : (
                        <>
                            <StatCard label="Deposited" value={`${totalDeposited}`} icon={<Inbox size={16} strokeWidth={2.5} />} />
                            <StatCard label="Sent" value={`${totalPayments}`} icon={<Globe size={16} strokeWidth={2.5} />} />
                            <StatCard label="Withdrawn" value={`${totalWithdrawn}`} icon={<Upload size={16} strokeWidth={2.5} />} />
                        </>
                    )}
                </div>
            </div>

            {!vaultState && (
                <div className="flex flex-col items-start gap-4 p-6 rounded-[2rem] mb-10 relative overflow-hidden
                        bg-white border border-yellow-200 shadow-sm ml-4 md:ml-8">
                    <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400" />
                    <div className="flex items-start gap-4">
                        <AlertCircle className="text-yellow-600 shrink-0" size={24} />
                        <p className="text-[0.9rem] text-gray-600 leading-relaxed font-medium">
                            <strong className="text-gray-900 block mb-1 text-[1rem]">Treasury Vault Not Initialised</strong>
                            An admin must call <code className="font-mono bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded text-gray-800 text-[0.8rem]">initializeTreasuryVault</code> before operations can begin.
                        </p>
                    </div>
                    {onInitialize && (
                        <button
                            onClick={onInitialize}
                            disabled={loading}
                            className="bg-yellow-500 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm hover:bg-yellow-600 transition-colors disabled:opacity-50 ml-10"
                        >
                            {loading ? "Initializing..." : "Initialize Vault Now"}
                        </button>
                    )}
                </div>
            )}

            {/* Sub-Accounts */}
            {companyAccount && (
                <SubAccountsTable
                    subAccounts={subAccounts}
                    loading={loading}
                    onCreateSubAccount={() => setIsCreateModalOpen(true)}
                    onFundSubAccount={(name) => setFundModalTarget(name)}
                    onWithdrawSubAccount={(name) => setWithdrawModalTarget(name)}
                />
            )}

            {/* Activity */}
            <div className="bg-[#ebebeb] rounded-2xl p-8 ml-4 md:ml-8">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-extrabold text-gray-900">Activity</h3>
                </div>
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                    {loading ? (
                        <div className="flex flex-col gap-3">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex items-center gap-4 animate-pulse">
                                    <div className="w-8 h-8 bg-gray-300/60 rounded-full shrink-0" />
                                    <div className="flex-1 flex flex-col gap-2">
                                        <div className="h-3 bg-gray-300/60 rounded-lg w-1/3" />
                                        <div className="h-3 bg-gray-300/60 rounded-lg w-2/3" />
                                    </div>
                                    <div className="h-4 w-16 bg-gray-300/60 rounded-lg ml-auto shrink-0" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <TransactionHistory logs={transactionLogs} loading={loading} onRefresh={onRefresh} hideHeader={true} isActivityView={true} />
                    )}
                </div>
            </div>

            <CreateSubAccountModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={onCreateSubAccount}
                loading={loading}
            />

            <FundSubAccountModal
                isOpen={fundModalTarget !== null}
                onClose={() => setFundModalTarget(null)}
                onFund={onFundSubAccount}
                loading={loading}
                subAccountName={fundModalTarget || ""}
                maxAvailable={companyAccount?.treasuryBalance || BigInt(0)}
            />

            <WithdrawSubAccountModal
                isOpen={withdrawModalTarget !== null}
                onClose={() => setWithdrawModalTarget(null)}
                onWithdraw={onWithdrawSubAccount}
                loading={loading}
                subAccountName={withdrawModalTarget || ""}
                maxAvailable={subAccounts.find(s => s.name === withdrawModalTarget)?.balance || BigInt(0)}
            />

            <StatsSidebar
                isOpen={isStatsOpen}
                onClose={() => setIsStatsOpen(false)}
                transactionLogs={transactionLogs}
                subAccounts={subAccounts}
            />
        </div>
    );
};
