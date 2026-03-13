import React from "react";
import type { SubAccountData } from "../hooks/useZeroGlobal";
import { formatUsdc, formatTimestamp } from "../utils/formatters";
import { Plus, ArrowDownCircle } from "lucide-react";

interface SubAccountsTableProps {
    subAccounts: SubAccountData[];
    loading: boolean;
    onCreateSubAccount: () => void;
    onFundSubAccount: (name: string) => void;
    onWithdrawSubAccount: (name: string) => void;
}

const SkeletonRow: React.FC = () => (
    <tr className="border-b border-gray-200/60 animate-pulse">
        <td className="py-4 px-4 pl-0"><div className="h-4 w-28 bg-gray-300/60 rounded-lg" /></td>
        <td className="py-4 px-4"><div className="h-2 w-full bg-gray-300/60 rounded-full" /></td>
        <td className="py-4 px-4 text-right"><div className="h-4 w-16 bg-gray-300/60 rounded-lg ml-auto" /></td>
        <td className="py-4 px-4 hidden sm:table-cell"><div className="h-4 w-20 bg-gray-300/60 rounded-lg" /></td>
        <td className="py-4 px-4 pr-0 text-right"><div className="h-7 w-16 bg-gray-300/60 rounded-lg ml-auto" /></td>
    </tr>
);

export const SubAccountsTable: React.FC<SubAccountsTableProps> = ({
    subAccounts,
    loading,
    onCreateSubAccount,
    onFundSubAccount,
    onWithdrawSubAccount,
}) => {
    return (
        <div className="bg-[#ebebeb] rounded-2xl p-8 ml-4 md:ml-8 mb-8">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <h3 className="text-xl font-extrabold text-gray-900">Sub-Accounts</h3>
                    <span className="bg-gray-200 text-gray-700 text-xs font-bold px-2.5 py-1 rounded-full">
                        {loading ? "…" : subAccounts.length}
                    </span>
                </div>
                <button
                    onClick={onCreateSubAccount}
                    disabled={loading}
                    className="flex items-center gap-2 bg-black text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                    <Plus size={16} />
                    New Account
                </button>
            </div>

            {/* Always show the table shell; fill with skeleton or real rows */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-transparent text-gray-500 border-b border-gray-300 text-[0.75rem] uppercase tracking-wider font-bold">
                            <th className="py-4 px-4 pl-0">Account Name</th>
                            <th className="py-4 px-4">Balance Range</th>
                            <th className="py-4 px-4 text-right">Balance</th>
                            <th className="py-4 px-4 hidden sm:table-cell">Created</th>
                            <th className="py-4 px-4 pr-0 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <>
                                <SkeletonRow />
                                <SkeletonRow />
                                <SkeletonRow />
                            </>
                        ) : subAccounts.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-10 text-center">
                                    <p className="text-gray-500 font-medium text-sm">No sub-accounts created yet. Manage isolated balances for different operations directly from your treasury.</p>
                                </td>
                            </tr>
                        ) : (
                            subAccounts.map((account) => {
                                const totalBalance = subAccounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
                                const percentage = totalBalance > 0 ? (Number(account.balance) / totalBalance) * 100 : 0;

                                return (
                                    <tr key={account.publicKey.toBase58()} className="border-b border-gray-200/60">
                                        <td className="py-4 px-4 pl-0">
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-gray-900 text-[0.95rem]">{account.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 w-1/4">
                                            <div className="w-full bg-gray-200 rounded-full h-1.5 flex overflow-hidden">
                                                <div
                                                    className="bg-black h-1.5 rounded-full"
                                                    style={{ width: `${percentage}%` }}
                                                ></div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <span className="font-extrabold text-gray-900 text-[1rem] tabular-nums font-mono">${formatUsdc(account.balance)}</span>
                                                <img src="/usdc-logo.png" alt="USDC" className="w-4 h-4 object-contain" />
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 hidden sm:table-cell">
                                            <span className="text-[0.85rem] text-gray-500 font-medium">
                                                {formatTimestamp(Number(account.createdAt))}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 pr-0 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => onFundSubAccount(account.name)}
                                                    disabled={loading}
                                                    className="inline-flex items-center justify-center bg-gray-100 text-black p-2 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                                                    title="Fund"
                                                >
                                                    <ArrowDownCircle size={16} />
                                                </button>
                                                <button
                                                    onClick={() => onWithdrawSubAccount(account.name)}
                                                    disabled={loading}
                                                    className="inline-flex items-center justify-center bg-gray-100 text-black p-2 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                                                    title="Withdraw"
                                                >
                                                    <ArrowDownCircle size={16} className="rotate-180" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
