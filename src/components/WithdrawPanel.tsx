import React, { useState } from "react";
import type { CompanyAccountData } from "../hooks/useZeroGlobal";
import { formatUsdc } from "../utils/formatters";
import { ShieldCheck, Wallet, Upload } from "lucide-react";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletButton } from "./WalletButton";

interface WithdrawPanelProps {
    companyAccount: CompanyAccountData | null;
    onWithdraw: (amount: number) => Promise<void>;
    loading: boolean;
}

interface Toast { type: "success" | "error"; msg: string; }

export const WithdrawPanel: React.FC<WithdrawPanelProps> = ({ companyAccount, onWithdraw, loading }) => {
    const { connected } = useWallet();
    const [amount, setAmount] = useState("");
    const [toast, setToast] = useState<Toast | null>(null);

    const showToast = (type: Toast["type"], msg: string) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 5000);
    };

    const balance = companyAccount ? Number(companyAccount.treasuryBalance) / 1e6 : 0;
    const parsedAmount = parseFloat(amount);
    const overBal = !!amount && parsedAmount > balance;
    const isValid = !!amount && parsedAmount > 0 && !overBal;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) return;
        try {
            await onWithdraw(parsedAmount);
            showToast("success", `Successfully withdrew ${parsedAmount} USDC to your wallet.`);
            setAmount("");
        } catch (e: unknown) {
            showToast("error", e instanceof Error ? e.message : String(e));
        }
    };

    if (!connected) {
        return (
            <div className="flex flex-col items-center justify-center p-10 bg-white border border-gray-200 rounded-[2rem] shadow-sm mt-10 max-w-2xl mx-auto text-center gap-6">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                    <Upload className="text-gray-400" size={32} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
                    <p className="text-gray-500 font-medium">Please connect your Solana wallet to withdraw funds from the treasury.</p>
                </div>
                <WalletButton />
            </div>
        );
    }

    if (!companyAccount) return (
        <div>
            <div className="mb-6"><h2 className="text-[1.4rem] font-bold text-gray-900">Withdraw</h2></div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
                <ShieldCheck className="text-gray-400 shrink-0 mt-0.5" size={20} />
                <p className="text-[0.87rem] text-gray-600 font-medium">Register your company before you can withdraw funds.</p>
            </div>
        </div>
    );

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col items-center justify-center mb-10 text-center">
                <h2 className="text-[1.8rem] font-extrabold text-gray-900 tracking-tight mb-2">Withdraw Funds</h2>
                <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-1.5 shadow-sm">
                    <span className="text-[0.75rem] font-bold text-gray-400 uppercase tracking-widest">Available Treasury</span>
                    <span className="text-[0.95rem] font-black text-gray-900">
                        {formatUsdc(companyAccount.treasuryBalance)} <span className="text-gray-400 font-bold">USDC</span>
                    </span>
                </div>
            </div>

            {/* Cards Section */}
            <div className="max-w-4xl mx-auto">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

                    {/* Left Card: Amount Input */}
                    <div className="bg-[#ebebeb] border border-gray-200 rounded-[2rem] shadow-sm p-10 flex flex-col gap-8">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-1">Enter Amount</h3>
                            <p className="text-[1rem] text-gray-500 font-medium">How much USDC to withdraw?</p>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg pointer-events-none">$</span>
                                <input
                                    id="wd-amount"
                                    type="number"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    min="0.000001"
                                    max={balance}
                                    step="any"
                                    required
                                    className="pl-10 pr-4 py-3.5 w-full bg-white border border-gray-200 rounded-xl
                                   text-gray-900 text-[1rem] font-semibold outline-none placeholder:text-gray-300
                                   focus:border-black focus:ring-1 focus:ring-black
                                   transition-all duration-200 shadow-sm"
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                {overBal ? (
                                    <p className="text-[0.8rem] text-red-500 font-bold bg-red-50 px-2 py-1 rounded inline-flex">⚠ Exceeds treasury balance</p>
                                ) : (
                                    <span className="text-[0.8rem] text-gray-400 font-medium">No maximum limit</span>
                                )}
                                <button
                                    type="button"
                                    disabled={balance === 0}
                                    onClick={() => setAmount(balance.toFixed(6))}
                                    className="px-4 py-1.5 text-[0.85rem] rounded-lg font-bold shadow-sm
                                   bg-white border border-gray-200 text-gray-600
                                   hover:bg-gray-50 hover:text-gray-900 disabled:opacity-30
                                   transition-all duration-150"
                                >
                                    Withdraw Max
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Card: Details + Withdraw Button */}
                    <div className="bg-[#ebebeb] border border-gray-200 rounded-[2rem] shadow-sm p-10 flex flex-col justify-between">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-6">Withdraw Details</h3>

                            <div className="flex flex-col divide-y divide-gray-200/60 mb-8">
                                <div className="flex justify-between items-center py-4">
                                    <span className="text-gray-500 font-bold text-[0.9rem] uppercase tracking-widest">Network</span>
                                    <span className="text-gray-900 font-bold text-[0.95rem]">Solana</span>
                                </div>
                                <div className="flex justify-between items-center py-4">
                                    <span className="text-gray-500 font-bold text-[0.9rem] uppercase tracking-widest">Destination</span>
                                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-100">
                                        <Wallet size={16} className="text-gray-400" />
                                        <span className="text-gray-900 font-bold text-[0.85rem]">Your Wallet</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center py-4">
                                    <span className="text-gray-500 font-bold text-[0.9rem] uppercase tracking-widest">Network Fee</span>
                                    <span className="text-gray-900 font-bold text-[0.95rem] bg-white px-2.5 py-1 rounded-md shadow-sm border border-gray-100">~0.000005 SOL</span>
                                </div>
                                <div className="flex justify-between items-center pt-5 pb-1">
                                    <span className="text-gray-900 font-extrabold text-[1.1rem]">You'll Receive</span>
                                    <span className={`font-black text-[1.5rem] tracking-tight transition-colors ${isValid ? 'text-emerald-600' : 'text-gray-300'}`}>
                                        {isValid ? `$${parsedAmount.toFixed(2)}` : '—'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !isValid}
                            className="flex items-center justify-center gap-2 w-full py-5 rounded-2xl
                               font-bold text-white text-[1.1rem] bg-gray-900 hover:bg-black
                               shadow-md hover:shadow-lg
                               disabled:opacity-40 disabled:cursor-not-allowed
                               transition-all duration-200 relative overflow-hidden group"
                        >
                            {loading ? (
                                <div className="absolute inset-0 flex items-center justify-start overflow-hidden bg-gray-900">
                                    <div className="h-full bg-blue-500/80 w-full animate-[progress_1.5s_ease-in-out_infinite] opacity-50 backdrop-blur-sm"></div>
                                    <div className="absolute inset-0 flex items-center justify-center gap-3 scale-110">
                                        <span className="w-5 h-5 rounded-full border-[3px] border-white/20 border-t-white animate-spin"></span>
                                        <span className="text-white font-black tracking-widest uppercase text-[0.95rem]">Withdrawing...</span>
                                    </div>
                                </div>
                            ) : "Withdraw Funds"}
                        </button>
                    </div>
                </form>

                {/* Toast */}
                {toast && (
                    <div className={`fixed bottom-6 right-6 z-50 max-w-sm w-full animate-in fade-in slide-in-from-bottom-5
                         bg-white border-l-4 border border-gray-200 rounded-xl shadow-lg px-5 py-4
                         ${toast.type === "success" ? "border-l-emerald-500" : "border-l-red-500"}`}>
                        <p className="font-bold text-[0.9rem] text-gray-900 mb-0.5">
                            {toast.type === "success"
                                ? <span className="text-emerald-600">✅ Withdrawn</span>
                                : <span className="text-red-500">✕ Error</span>}
                        </p>
                        <p className="text-[0.83rem] text-gray-600 font-medium break-all">{toast.msg}</p>
                    </div>
                )}
            </div>
        </div>
    );
};
