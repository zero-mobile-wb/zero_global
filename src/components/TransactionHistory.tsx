import React, { useMemo, useState } from "react";
import type { TxLogData } from "../hooks/useZeroGlobal";
import { formatUsdc, truncateAddress, formatTimestamp } from "../utils/formatters";
import { ArrowUpRight, ArrowDownLeft, Inbox, RefreshCw, ExternalLink, Calendar as CalendarIcon, List } from "lucide-react";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletButton } from "./WalletButton";

interface TransactionHistoryProps {
    logs: TxLogData[];
    loading: boolean;
    onRefresh: () => void;
    hideHeader?: boolean;
    isActivityView?: boolean;
    scrollable?: boolean;
}

function PaymentTypeBadge({ type }: { type: Record<string, Record<string, never>> }) {
    const key = Object.keys(type)[0] ?? "crossBorder";
    const map: Record<string, { label: string; cls: string }> = {
        crossBorder: { label: "Cross-Border", cls: "bg-gray-100 text-gray-800 border-gray-200" },
        domestic: { label: "Domestic", cls: "bg-gray-100 text-gray-800 border-gray-200" },
        refund: { label: "Refund", cls: "bg-gray-100 text-gray-800 border-gray-200" },
        settlement: { label: "Settlement", cls: "bg-gray-100 text-gray-800 border-gray-200" },
        deposit: { label: "Deposit", cls: "bg-gray-100 text-gray-800 border-gray-200" },
        withdrawal: { label: "Withdrawal", cls: "bg-gray-100 text-gray-800 border-gray-200" },
        subAccountCreated: { label: "New Sub-Acct", cls: "bg-gray-100 text-gray-800 border-gray-200" },
        subAccountFunded: { label: "Fund Sub-Acct", cls: "bg-gray-100 text-gray-800 border-gray-200" },
        subAccountWithdrawal: { label: "Withdraw Sub-Acct", cls: "bg-gray-100 text-gray-800 border-gray-200" },
        subAccountExternalPayment: { label: "Ext Sub-Acct Pay", cls: "bg-gray-100 text-gray-800 border-gray-200" },
    };
    const { label, cls } = map[key] ?? map.crossBorder;
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[0.65rem] font-bold border ${cls} uppercase tracking-wider`}>
            {label}
        </span>
    );
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ logs, loading, onRefresh, hideHeader, isActivityView, scrollable }) => {
    const { connected } = useWallet();
    const [selectedDate, setSelectedDate] = useState<string>("");

    const filteredLogs = useMemo(() => {
        if (!selectedDate) return logs;
        return logs.filter(log => {
            const d = new Date(Number(log.timestamp) * 1000);
            const logDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            return logDateStr === selectedDate;
        });
    }, [logs, selectedDate]);

    if (!connected && !isActivityView) {
        return (
            <div className="flex flex-col items-center justify-center p-10 bg-white border border-gray-200 rounded-[2rem] shadow-sm mt-10 max-w-2xl mx-auto text-center gap-6">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                    <List className="text-gray-400" size={32} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
                    <p className="text-gray-500 font-medium">Please connect your Solana wallet to view transaction logs.</p>
                </div>
                <WalletButton />
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            {!hideHeader && (
                <div className="flex items-start justify-between mb-8 gap-4">
                    <div>
                        <h2 className="text-[1.6rem] font-extrabold mb-1 text-gray-900 tracking-tight">Transaction History</h2>
                        <p className="text-[0.9rem] text-gray-500 font-medium">On-chain payment records from your company</p>
                    </div>
                    <button
                        onClick={onRefresh}
                        disabled={loading}
                        className="flex items-center gap-2 shrink-0
                         bg-white text-gray-700 border border-gray-200 rounded-lg shadow-sm
                         px-4 py-2.5 text-[0.83rem] font-bold
                         hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40
                         transition-colors duration-150"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                        {loading ? "Refreshing..." : "Refresh Data"}
                    </button>
                </div>
            )}

            <div className="flex flex-col bg-[#ebebeb] border-none shadow-none overflow-hidden">
                <div className="flex justify-end pb-4">
                    <div className="relative flex items-center">
                        <input
                            type="date"
                            className="absolute opacity-0 inset-0 w-full h-full cursor-pointer z-10"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                        <button className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-[0.8rem] font-bold shadow-sm hover:bg-gray-50 z-0">
                            <CalendarIcon size={14} />
                            {selectedDate || "Set Date"}
                        </button>
                        {selectedDate && (
                            <button onClick={() => setSelectedDate("")} className="ml-2 text-[0.7rem] text-gray-500 hover:text-gray-900 z-20 relative font-bold">
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                        <Inbox size={48} className="text-gray-300" strokeWidth={1} />
                        <div>
                            <h3 className="font-bold text-lg text-gray-900">No transactions found</h3>
                            <p className="text-[0.88rem] text-gray-500 mt-1 max-w-sm mx-auto">Try adjusting your filters or make a new transaction.</p>
                        </div>
                    </div>
                ) : (
                    <div className={`overflow-x-auto ${scrollable ? 'max-h-[480px] overflow-y-auto custom-scrollbar' : ''}`}>
                        <table className="w-full text-left border-collapse relative">
                            <thead className={scrollable ? "sticky top-0 bg-[#ebebeb] z-10 shadow-sm" : ""}>
                                <tr className="text-gray-500 border-b border-gray-300 text-[0.75rem] uppercase tracking-wider font-bold">
                                    <th className="py-3 px-5">Type / Ref</th>
                                    <th className="py-3 px-5">From / To</th>
                                    <th className="py-3 px-5">Date</th>
                                    <th className="py-3 px-5 text-right">Amount</th>
                                    <th className="py-3 px-5 text-right">Link</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.map((log) => {
                                    const typeKey = Object.keys(log.paymentType)[0] ?? "crossBorder";
                                    const isCredit = typeKey === "deposit" || typeKey === "subAccountWithdrawal";
                                    const isNeutral = typeKey === "subAccountCreated";

                                    return (
                                        <tr key={log.publicKey.toBase58()} className="border-b border-gray-300 hover:bg-transparent transition-colors group">
                                            <td className="py-3 px-5 whitespace-nowrap">
                                                <div className="flex flex-col items-start gap-1">
                                                    <PaymentTypeBadge type={log.paymentType} />
                                                    <span className="text-[0.75rem] text-gray-500 font-medium">#{log.paymentReference.substring(0, 8)}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-5 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded flex items-center justify-center shrink-0 border bg-white text-gray-800 border-gray-200 shadow-sm">
                                                        {isNeutral ? <Inbox size={14} strokeWidth={2.5} /> : isCredit ? <ArrowDownLeft size={14} strokeWidth={2.5} /> : <ArrowUpRight size={14} strokeWidth={2.5} />}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[0.7rem] text-gray-400 font-bold tracking-wider">{isNeutral ? 'INFO' : isCredit ? 'FROM' : 'TO'}</span>
                                                        <span className="font-mono text-gray-900 text-[0.85rem]">{truncateAddress(isCredit ? log.senderCompany.toBase58() : log.recipientWallet.toBase58(), 6)}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-5 whitespace-nowrap">
                                                <span className="text-[0.8rem] text-gray-600 font-medium">{formatTimestamp(Number(log.timestamp))}</span>
                                            </td>
                                            <td className="py-3 px-5 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <span className={`text-[0.95rem] font-bold ${isNeutral ? 'text-gray-600' : isCredit ? 'text-emerald-600' : 'text-red-500'}`}>
                                                        {isNeutral ? '' : isCredit ? '+' : '−'}${formatUsdc(log.amount)}
                                                    </span>
                                                    <img src="/usdc-logo.png" alt="USDC" className="w-4 h-4 object-contain opacity-90" />
                                                </div>
                                            </td>
                                            <td className="py-3 px-5 whitespace-nowrap text-right">
                                                <a
                                                    href={`https://explorer.solana.com/address/${log.publicKey.toBase58()}?cluster=devnet`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded bg-white border border-gray-200 shadow-sm text-gray-400 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                                                >
                                                    <ExternalLink size={14} strokeWidth={2.5} />
                                                </a>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
