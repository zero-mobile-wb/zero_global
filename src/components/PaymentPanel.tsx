import React, { useState } from "react";
import type { CompanyAccountData } from "../hooks/useZeroGlobal";
import { formatUsdc } from "../utils/formatters";
import { CheckCircle2, Globe, ShieldCheck, Wallet } from "lucide-react";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletButton } from "./WalletButton";

interface PaymentPanelProps {
    companyAccount: CompanyAccountData | null;
    onPayment: (recipient: string, amount: number, ref: string) => Promise<void>;
    loading: boolean;
}

interface Toast { type: "success" | "error"; msg: string; }

export const PaymentPanel: React.FC<PaymentPanelProps> = ({ companyAccount, onPayment, loading }) => {
    const { connected } = useWallet();
    const [recipient, setRecipient] = useState("");
    const [amount, setAmount] = useState("");
    const [reference, setReference] = useState("");
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [toast, setToast] = useState<Toast | null>(null);

    const showToast = (type: Toast["type"], msg: string) => { setToast({ type, msg }); setTimeout(() => setToast(null), 6000); };
    const balance = companyAccount ? Number(companyAccount.treasuryBalance) / 1e6 : 0;
    const overBal = amount && parseFloat(amount) > balance;

    const handleConfirmPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        const n = parseFloat(amount);
        if (!n || n <= 0) { showToast("error", "Enter a valid amount."); return; }
        if (n > balance) { showToast("error", "Insufficient treasury balance."); return; }
        if (!recipient || recipient.length < 32) { showToast("error", "Enter a valid Solana wallet address."); return; }
        const ref = reference.trim() || `REF-${Date.now()}`;
        if (ref.length > 64) { showToast("error", "Reference must be ≤ 64 characters."); return; }

        try {
            await onPayment(recipient, n, ref);
            setStep(3); // Keep Step 3 for Success view only
        } catch (e: unknown) { showToast("error", e instanceof Error ? e.message : String(e)); }
    };

    const resetFlow = () => { setStep(1); setRecipient(""); setAmount(""); setReference(""); };

    const inputCls = `px-4 py-3 w-full bg-gray-50/50 border border-gray-200 rounded-xl
        text-gray-900 text-[0.95rem] font-medium outline-none placeholder:text-gray-300
        focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900
        transition-all duration-200`;

    if (!connected) {
        return (
            <div className="flex flex-col items-center justify-center p-10 bg-white border border-gray-200 rounded-[2rem] shadow-sm mt-10 max-w-2xl mx-auto text-center gap-6">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                    <Globe className="text-gray-400" size={32} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
                    <p className="text-gray-500 font-medium">Please connect your Solana wallet to send global payments.</p>
                </div>
                <WalletButton />
            </div>
        );
    }

    if (!companyAccount) return (
        <div>
            <div className="mb-6"><h2 className="text-[1.4rem] font-bold text-gray-900">Send Payment</h2></div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
                <ShieldCheck className="text-gray-400 shrink-0 mt-0.5" size={20} />
                <p className="text-[0.87rem] text-gray-600 font-medium pt-0.5">Register your company before sending cross-border payments.</p>
            </div>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col items-center justify-center mb-8 text-center">
                <h2 className="text-[1.8rem] font-extrabold mb-2 text-gray-900 tracking-tight">Send Payment</h2>
                <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-1.5 shadow-sm">
                    <span className="text-[0.75rem] font-bold text-gray-400 uppercase tracking-widest">Available Balance</span>
                    <span className="text-[0.95rem] font-black text-gray-900">{formatUsdc(companyAccount.treasuryBalance)} <span className="text-gray-400 font-bold">USDC</span></span>
                </div>
            </div>

            {step === 1 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <form onSubmit={handleConfirmPayment} className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                        {/* Left Card: Form Fields */}
                        <div className="bg-[#ebebeb] rounded-[2rem] p-10 flex flex-col gap-8">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">Payment Details</h3>
                                <p className="text-[1rem] text-gray-500 font-medium">Fill in the recipient and amount below.</p>
                            </div>

                            {/* Recipient */}
                            <div className="flex flex-col gap-2">
                                <label htmlFor="pay-rec" className="text-[0.8rem] font-bold text-gray-500 uppercase tracking-widest">
                                    Recipient Wallet
                                </label>
                                <input
                                    id="pay-rec"
                                    type="text"
                                    placeholder="Solana public key (base58)"
                                    value={recipient}
                                    onChange={(e) => setRecipient(e.target.value)}
                                    required
                                    className={`py-4 ${inputCls}`}
                                />
                            </div>

                            {/* Amount */}
                            <div className="flex flex-col gap-2">
                                <label htmlFor="pay-amt" className="text-[0.8rem] font-bold text-gray-500 uppercase tracking-widest">
                                    Amount (USDC)
                                </label>
                                <div className="relative flex items-center">
                                    <span className="absolute left-5 text-gray-400 font-bold text-xl pointer-events-none">$</span>
                                    <input
                                        id="pay-amt"
                                        type="number"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        min="0.000001"
                                        max={balance}
                                        step="any"
                                        required
                                        className={`pl-12 py-4 text-lg ${inputCls}`}
                                    />
                                </div>
                                {overBal && <p className="text-[0.8rem] text-red-500 font-bold">⚠ Exceeds treasury balance</p>}
                            </div>

                            {/* Reference */}
                            <div className="flex flex-col gap-2">
                                <label htmlFor="pay-ref" className="text-[0.8rem] font-bold text-gray-500 uppercase tracking-widest">
                                    Payment Reference <span className="normal-case font-normal tracking-normal text-gray-400">(optional)</span>
                                </label>
                                <input
                                    id="pay-ref"
                                    type="text"
                                    placeholder="e.g. INV-2025-001"
                                    value={reference}
                                    onChange={(e) => setReference(e.target.value)}
                                    maxLength={64}
                                    className={`py-4 ${inputCls}`}
                                />
                                <p className="text-[0.8rem] text-gray-400 font-medium px-1">Stored on-chain for reconciliation. Auto-generated if blank.</p>
                            </div>
                        </div>

                        {/* Right Card: Transaction Preview */}
                        <div className="bg-[#ebebeb] rounded-[2rem] p-10 flex flex-col justify-between">
                            <div className="flex flex-col gap-5">
                                <h3 className="text-[0.8rem] font-bold text-gray-500 uppercase tracking-widest mb-2">Transaction Preview</h3>

                                <div className="flex justify-between items-center py-4 border-b border-gray-200/60">
                                    <span className="text-gray-500 font-bold text-[0.9rem]">From</span>
                                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm">
                                        <ShieldCheck size={16} className="text-emerald-500" />
                                        <span className="text-gray-900 font-bold text-[0.9rem]">Treasury Vault</span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center py-4 border-b border-gray-200/60">
                                    <span className="text-gray-500 font-bold text-[0.9rem]">To</span>
                                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm max-w-[60%]">
                                        <Wallet size={16} className="text-gray-400 shrink-0" />
                                        <span className="text-gray-900 font-mono text-[0.85rem] truncate">
                                            {recipient ? `${recipient.slice(0, 8)}…${recipient.slice(-4)}` : "Recipient"}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center py-4 border-b border-gray-200/60">
                                    <span className="text-gray-500 font-bold text-[0.9rem]">Network</span>
                                    <div className="flex items-center gap-2">
                                        <Globe size={16} className="text-blue-400" />
                                        <span className="text-gray-900 font-bold text-[0.9rem]">Solana</span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center py-4 border-b border-gray-200/60">
                                    <span className="text-gray-500 font-bold text-[0.9rem]">Network Fee</span>
                                    <span className="text-gray-900 font-bold text-[0.9rem]">~0.000005 SOL</span>
                                </div>

                                <div className="flex justify-between items-center pt-5">
                                    <span className="text-gray-900 font-extrabold text-[1.1rem]">Total Send</span>
                                    <div className="flex items-center gap-2">
                                        <span className={`font-black text-[1.6rem] ${amount && parseFloat(amount) > 0 && !overBal ? 'text-gray-900' : 'text-gray-300'}`}>
                                            ${amount && parseFloat(amount) > 0 ? parseFloat(amount).toFixed(2) : '0.00'}
                                        </span>
                                        <img src="/usdc-logo.png" alt="USDC" className={`w-6 h-6 object-contain ${amount && parseFloat(amount) > 0 && !overBal ? '' : 'opacity-40'}`} />
                                    </div>
                                </div>
                            </div>

                            <button type="submit"
                                disabled={loading || !recipient || !amount || parseFloat(amount) <= 0 || Boolean(overBal)}
                                className="mt-10 flex items-center justify-center gap-2 w-full py-4 rounded-xl
                                     font-bold text-white text-[1.1rem] bg-black hover:bg-gray-800 shadow-md hover:shadow-lg
                                     disabled:opacity-40 disabled:cursor-not-allowed
                                     transition-all duration-200 relative overflow-hidden">
                                {loading && (
                                    <div className="absolute inset-0 bg-gray-900 flex items-center justify-start overflow-hidden">
                                        <div className="h-full bg-blue-500 w-full animate-[progress_2s_ease-in-out_infinite] opacity-50"></div>
                                        <div className="absolute inset-0 flex items-center justify-center gap-2">
                                            <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                                            <span className="text-white font-bold tracking-wide">Sending...</span>
                                        </div>
                                    </div>
                                )}
                                {!loading && "Confirm Payment"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Step 3: Success */}
            {step === 3 && (
                <div className="animate-in zoom-in-95 fade-in duration-500 flex flex-col items-center justify-center py-10 text-center max-w-md mx-auto">
                    <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-blue-100">
                        <CheckCircle2 size={48} className="text-blue-500" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Payment Sent!</h3>
                    <p className="text-gray-500 font-medium mb-8 text-[1.05rem] leading-relaxed">
                        You have successfully sent <span className="text-gray-900 font-bold bg-white px-2 py-1 rounded-md border border-gray-200">{amount} USDC</span> to{" "}
                        <span className="font-mono text-gray-900 font-bold bg-white px-2 py-1 rounded-md border border-gray-200">{recipient.slice(0, 8)}…{recipient.slice(-4)}</span>
                    </p>
                    <button
                        onClick={resetFlow}
                        className="px-8 py-4 rounded-xl font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm w-full">
                        Send Another Payment
                    </button>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 max-w-sm w-full animate-in fade-in slide-in-from-bottom-5
                     bg-white border-l-4 border border-gray-200 rounded-xl shadow-lg px-5 py-4
                     ${toast.type === "success" ? "border-l-emerald-500" : "border-l-red-500"}`}>
                    <p className="font-bold text-[0.9rem] text-gray-900 mb-0.5">
                        {toast.type === "success"
                            ? <span className="text-emerald-600">✅ Payment Sent</span>
                            : <span className="text-red-500">✕ Error</span>}
                    </p>
                    <p className="text-[0.83rem] text-gray-600 font-medium break-all">{toast.msg}</p>
                </div>
            )}
        </div>
    );
};
