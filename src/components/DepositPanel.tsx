import React, { useState } from "react";
import type { CompanyAccountData } from "../hooks/useZeroGlobal";
import { formatUsdc } from "../utils/formatters";
import { ArrowRight, CheckCircle2, ChevronLeft, ShieldCheck, Wallet, Download } from "lucide-react";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletButton } from "./WalletButton";

interface DepositPanelProps {
    companyAccount: CompanyAccountData | null;
    onDeposit: (amount: number) => Promise<void>;
    loading: boolean;
}

interface Toast { type: "error"; msg: string; }

const QUICK = [10, 50, 100, 500];

export const DepositPanel: React.FC<DepositPanelProps> = ({ companyAccount, onDeposit, loading }) => {
    const { connected } = useWallet();
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [amount, setAmount] = useState("");
    const [toast, setToast] = useState<Toast | null>(null);

    const showError = (msg: string) => {
        setToast({ type: "error", msg });
        setTimeout(() => setToast(null), 5000);
    };

    const handleContinueToReview = (e: React.FormEvent) => {
        e.preventDefault();
        const n = parseFloat(amount);
        if (!n || n <= 0) {
            showError("Please enter a valid amount greater than 0.");
            return;
        }
        setStep(2);
    };

    const handleConfirmDeposit = async () => {
        const n = parseFloat(amount);
        try {
            await onDeposit(n);
            setStep(3); // Success
        } catch (e: unknown) {
            showError(e instanceof Error ? e.message : String(e));
        }
    };

    const resetFlow = () => {
        setStep(1);
        setAmount("");
    };

    if (!connected) {
        return (
            <div className="flex flex-col items-center justify-center p-10 bg-white border border-gray-200 rounded-[2rem] shadow-sm mt-10 max-w-2xl mx-auto text-center gap-6">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                    <Download className="text-gray-400" size={32} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
                    <p className="text-gray-500 font-medium">Please connect your Solana wallet to deposit funds into the treasury.</p>
                </div>
                <WalletButton />
            </div>
        );
    }

    if (!companyAccount) return (
        <div>
            <div className="mb-6"><h2 className="text-[1.4rem] font-bold text-gray-900">Deposit USDC</h2></div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
                <ShieldCheck className="text-gray-400" size={20} />
                <p className="text-[0.87rem] text-gray-600 font-medium pt-0.5">Please register your company before depositing funds into the treasury.</p>
            </div>
        </div>
    );

    return (
        <div className="max-w-xl mx-auto">
            {/* Header */}
            <div className="flex flex-col items-center justify-center mb-8 text-center">
                <h2 className="text-[1.8rem] font-extrabold mb-2 text-gray-900 tracking-tight">Deposit USDC</h2>
                <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-1.5 shadow-sm">
                    <span className="text-[0.75rem] font-bold text-gray-400 uppercase tracking-widest">Treasury Balance</span>
                    <span className="text-[0.95rem] font-black text-gray-900">{formatUsdc(companyAccount.treasuryBalance)} <span className="text-gray-400 font-bold">USDC</span></span>
                </div>
            </div>

            {/* Progress Indicators (Outside Card) */}
            <div className="flex items-center justify-center gap-3 mb-10 w-full">
                <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[0.85rem] font-bold transition-colors ${step >= 1 ? 'bg-gray-900 text-white shadow-md' : 'bg-white text-gray-400 border border-gray-200'}`}>1</div>
                    <span className={`text-[0.8rem] font-bold uppercase tracking-widest transition-colors ${step >= 1 ? 'text-gray-900' : 'text-gray-400'}`}>Amount</span>
                </div>
                <div className={`h-[2px] flex-1 max-w-[4rem] rounded-full transition-colors ${step >= 2 ? 'bg-gray-900' : 'bg-gray-200'}`}></div>
                <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[0.85rem] font-bold transition-colors ${step >= 2 ? 'bg-gray-900 text-white shadow-md' : 'bg-white text-gray-400 border border-gray-200'}`}>2</div>
                    <span className={`text-[0.8rem] font-bold uppercase tracking-widest transition-colors ${step >= 2 ? 'text-gray-900' : 'text-gray-400'}`}>Review</span>
                </div>
                <div className={`h-[2px] flex-1 max-w-[4rem] rounded-full transition-colors ${step >= 3 || loading ? 'bg-gray-900' : 'bg-gray-200'}`}></div>
                <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[0.85rem] font-bold transition-colors ${step >= 3 || loading ? 'bg-emerald-500 text-white shadow-md' : 'bg-white text-gray-400 border border-gray-200'}`}>
                        {step === 3 ? <CheckCircle2 size={16} /> : (loading ? <span className="w-4 h-4 rounded-full border-2 border-transparent border-t-white animate-spin"></span> : "3")}
                    </div>
                    <span className={`text-[0.8rem] font-bold uppercase tracking-widest transition-colors ${step >= 3 ? 'text-emerald-600' : loading ? 'text-gray-900' : 'text-gray-400'}`}>
                        {step === 3 ? 'Complete' : loading ? 'Loading' : 'Status'}
                    </span>
                </div>
            </div>

            {/* Flow Card */}
            <div className="bg-[#ebebeb] border border-gray-200 rounded-[2rem] shadow-sm relative overflow-hidden flex flex-col p-10">

                <div className="mt-4">
                    {/* Step 1: Amount Input */}
                    {step === 1 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300 max-w-md mx-auto">
                            <div className="mb-10 text-center">
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">Enter Amount</h3>
                                <p className="text-[1rem] text-gray-500 font-medium">How much USDC would you like to deposit?</p>
                            </div>

                            <form onSubmit={handleContinueToReview} className="flex flex-col gap-10">
                                <div className="flex flex-col gap-4">
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg pointer-events-none">$</span>
                                        <input
                                            id="dep-amount"
                                            type="number"
                                            placeholder="0.00"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            min="0"
                                            step="any"
                                            required
                                            autoFocus
                                            className="pl-10 pr-4 py-3.5 w-full bg-white border border-gray-200 rounded-xl
                                               text-gray-900 text-[1rem] font-semibold outline-none placeholder:text-gray-300
                                               focus:border-black focus:ring-1 focus:ring-black
                                               transition-all duration-200 shadow-sm"
                                        />
                                    </div>

                                    {/* Quick amounts */}
                                    <div className="flex justify-center gap-3 flex-wrap mt-2">
                                        {QUICK.map((q) => (
                                            <button key={q} type="button" onClick={() => setAmount(q.toString())}
                                                className="px-5 py-2.5 text-[0.95rem] rounded-xl font-bold
                                               bg-white border border-gray-200 text-gray-600 shadow-sm
                                               hover:bg-gray-50 hover:text-gray-900 hover:border-gray-400 hover:-translate-y-0.5
                                               active:bg-gray-100 active:translate-y-0 transition-all duration-200">
                                                +${q}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button type="submit"
                                    disabled={!amount || parseFloat(amount) <= 0}
                                    className="flex items-center justify-center gap-2 w-full py-5 rounded-2xl
                                         font-bold text-white text-[1.1rem] bg-gray-900 hover:bg-black shadow-md hover:shadow-lg
                                         disabled:opacity-40 disabled:cursor-not-allowed
                                         transition-all duration-200">
                                    Review Details <ArrowRight size={20} />
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Step 2: Review */}
                    {step === 2 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300 max-w-md mx-auto">
                            <div className="flex items-center justify-center relative mb-10">
                                <button onClick={() => setStep(1)} className="absolute left-0 p-3 -ml-3 rounded-2xl text-gray-400 hover:text-gray-900 hover:bg-white/60 transition-colors">
                                    <ChevronLeft size={28} className="stroke-[3px]" />
                                </button>
                                <div className="text-center">
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Review Deposit</h3>
                                    <p className="text-[1rem] text-gray-500 font-medium">Verify your transaction details.</p>
                                </div>
                            </div>

                            <div className="flex flex-col divide-y divide-gray-200/60 mb-8">
                                <div className="flex justify-between items-center py-4">
                                    <span className="text-gray-500 font-bold text-[0.9rem] uppercase tracking-widest">Network</span>
                                    <span className="text-gray-900 font-bold text-[0.95rem]">Solana</span>
                                </div>
                                <div className="flex justify-between items-center py-4">
                                    <span className="text-gray-500 font-bold text-[0.9rem] uppercase tracking-widest">Destination</span>
                                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-100">
                                        <div className="w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center">
                                            <span className="text-white text-[0.6rem] font-black">ZG</span>
                                        </div>
                                        <span className="text-gray-900 font-bold text-[0.85rem]">Zero Treasury</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center py-4">
                                    <span className="text-gray-500 font-bold text-[0.9rem] uppercase tracking-widest">Network Fee</span>
                                    <span className="text-gray-900 font-bold text-[0.95rem] bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-100">~0.000005 SOL</span>
                                </div>
                                <div className="flex justify-between items-center pt-5 pb-2">
                                    <span className="text-gray-900 font-extrabold text-[1.2rem]">Total Send</span>
                                    <span className="text-emerald-600 font-black text-[1.8rem] tracking-tight">${amount}</span>
                                </div>
                            </div>

                            <button
                                onClick={handleConfirmDeposit}
                                disabled={loading}
                                className={`flex items-center justify-center gap-3 w-full py-5 rounded-2xl
                                     font-bold text-white text-[1.1rem] shadow-md hover:shadow-lg
                                     disabled:cursor-not-allowed transition-all duration-300 relative overflow-hidden group
                                     ${loading ? 'bg-gray-800' : 'bg-black hover:bg-gray-900'}`}
                            >
                                {loading && (
                                    <div className="absolute inset-0 flex items-center justify-start overflow-hidden bg-gray-900">
                                        <div className="h-full bg-blue-500/80 w-full animate-[progress_1.5s_ease-in-out_infinite] opacity-50 backdrop-blur-sm"></div>
                                        <div className="absolute inset-0 flex items-center justify-center gap-3 scale-110">
                                            <span className="w-5 h-5 rounded-full border-[3px] border-white/20 border-t-white animate-spin"></span>
                                            <span className="text-white font-black tracking-widest uppercase text-[0.95rem]">Fast Loading...</span>
                                        </div>
                                    </div>
                                )}
                                {!loading && "Confirm & Deposit"}
                            </button>
                        </div>
                    )}

                    {/* Step 3: Success */}
                    {step === 3 && (
                        <div className="animate-in zoom-in-95 fade-in duration-500 flex flex-col items-center justify-center py-10 text-center max-w-md mx-auto">
                            <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-emerald-100">
                                <CheckCircle2 size={48} className="text-emerald-500" strokeWidth={2.5} />
                            </div>
                            <h3 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Deposit Successful!</h3>
                            <p className="text-gray-500 font-medium mb-10 text-[1.05rem] leading-relaxed">
                                You have successfully deposited <span className="text-gray-900 font-bold bg-white px-2 py-1 rounded-md border border-gray-200">${amount} USDC</span> into the Zero Global treasury.
                            </p>
                            <button
                                onClick={resetFlow}
                                className="px-8 py-4 rounded-xl font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm w-full">
                                Make Another Deposit
                            </button>
                        </div>
                    )}

                </div>
            </div>

            {/* Error Toast */}
            {toast && toast.type === "error" && (
                <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-in fade-in slide-in-from-bottom-5
                         bg-white border border-l-4 border-l-red-500 border-gray-200 rounded-xl shadow-lg px-5 py-4">
                    <p className="font-bold text-[0.9rem] text-gray-900 mb-0.5 flex items-center gap-2">
                        <span className="text-red-500">✕ Error</span>
                    </p>
                    <p className="text-[0.83rem] text-gray-600 font-medium break-all">{toast.msg}</p>
                </div>
            )}
        </div>
    );
};
