import React, { useState } from "react";
import type { CompanyAccountData } from "../hooks/useZeroGlobal";
import { formatTimestamp } from "../utils/formatters";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletButton } from "./WalletButton";
import { Building2, Globe, ShieldCheck } from "lucide-react";

interface RegisterCompanyProps {
    companyAccount: CompanyAccountData | null;
    onRegister: (companyId: string) => Promise<void>;
    loading: boolean;
}

interface Toast { type: "success" | "error"; msg: string; }

export const RegisterCompany: React.FC<RegisterCompanyProps> = ({ companyAccount, onRegister, loading }) => {
    const { connected } = useWallet();
    const [companyId, setCompanyId] = useState("");
    const [toast, setToast] = useState<Toast | null>(null);

    const showToast = (type: Toast["type"], msg: string) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 5000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = companyId.trim();
        if (trimmed.length < 3 || trimmed.length > 64) { showToast("error", "Company ID must be 3–64 chars."); return; }
        try {
            await onRegister(trimmed);
            showToast("success", `Company "${trimmed}" registered on-chain!`);
            setCompanyId("");
        } catch (e: unknown) { showToast("error", e instanceof Error ? e.message : String(e)); }
    };

    if (!connected) {
        return (
            <div className="flex flex-col items-center justify-center p-10 bg-white border border-gray-200 rounded-[2rem] shadow-sm mt-10 max-w-2xl mx-auto text-center gap-6">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                    <Building2 className="text-gray-400" size={32} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
                    <p className="text-gray-500 font-medium">Please connect your Solana wallet to view or register your Company Profile.</p>
                </div>
                <WalletButton />
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-[1.6rem] font-extrabold mb-1 text-gray-900 tracking-tight">Company Profile</h2>
                <p className="text-[0.9rem] text-gray-500 font-medium">Manage your business identity on the Zero Global treasury</p>
            </div>

            {companyAccount ? (
                /* ── Already registered ─────────────────────────────── */
                <div className="flex flex-col gap-8 ml-4 md:ml-8">
                    {/* Profile Card */}
                    <div className="bg-[#ebebeb] rounded-2xl p-8 flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <h3 className="text-[1.6rem] font-extrabold text-gray-900 mb-2 tracking-tight break-all">{companyAccount.companyId}</h3>
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-bold bg-emerald-100 text-emerald-800 rounded-lg px-2.5 py-1 uppercase tracking-wider">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        Active On-chain
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                            <div className="flex flex-col gap-1.5">
                                <p className="text-[0.75rem] font-bold text-gray-500 uppercase tracking-widest">Treasury Wallet Address</p>
                                <p className="text-[0.9rem] font-mono font-medium text-gray-900 break-all bg-white px-3 py-2 rounded-lg w-fit">
                                    {companyAccount.companyWallet.toBase58()}
                                </p>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <p className="text-[0.75rem] font-bold text-gray-500 uppercase tracking-widest">Registration Date</p>
                                <p className="text-[0.9rem] font-medium text-gray-900 bg-white px-3 py-2 rounded-lg w-fit">
                                    {formatTimestamp(Number(companyAccount.createdAt))}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Feature Info */}
                    <div className="bg-[#ebebeb] rounded-2xl p-8 flex flex-col gap-4">
                        <h3 className="text-xl font-bold text-gray-900">Sub-Accounts Now Live</h3>
                        <p className="text-[0.9rem] text-gray-500 font-medium leading-relaxed max-w-3xl">
                            You can now manage distinct balances for different operations directly from your Dashboard.
                            Create sub-accounts like "Payroll" or "Marketing" and allocate funds from your main treasury balance instantly, with zero external network fees.
                        </p>
                    </div>
                </div>
            ) : (
                /* ── Register form ──────────────────────────────────── */
                <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-8 ml-4 md:ml-8">
                    {/* Left Card: Form */}
                    <div className="bg-[#ebebeb] rounded-2xl p-8 flex flex-col justify-between flex-1">
                        <div className="flex flex-col gap-6">
                            <div>
                                <h3 className="text-xl font-extrabold text-gray-900 mb-1">Create Profile</h3>
                                <p className="text-[0.9rem] text-gray-500 font-medium">Choose a unique identifier for your business treasury.</p>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="company-id" className="text-[0.8rem] font-bold text-gray-500 uppercase tracking-widest">
                                    Company Identifier
                                </label>
                                <input
                                    id="company-id"
                                    type="text"
                                    placeholder="e.g. acme-global"
                                    value={companyId}
                                    onChange={(e) => setCompanyId(e.target.value)}
                                    maxLength={64}
                                    required
                                    autoFocus
                                    className="px-4 py-3 w-full bg-white rounded-xl
                                       text-gray-900 text-[1rem] font-bold outline-none placeholder:text-gray-300
                                       focus:ring-2 focus:ring-black
                                       transition-all duration-200"
                                />
                                <p className="text-[0.8rem] text-gray-500 font-medium px-1 mt-1">
                                    3–64 characters. This forms the base of your on-chain identity.
                                </p>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || companyId.trim().length < 3}
                            className="mt-8 flex items-center justify-center gap-2 w-full py-3.5 rounded-xl
                                 font-bold text-white text-[1rem] bg-black hover:bg-gray-800 
                                 disabled:opacity-40 disabled:cursor-not-allowed
                                 transition-all duration-200"
                        >
                            {loading ? "Processing..." : "Confirm Registration"}
                        </button>
                    </div>

                    {/* Right Card: Details Preview */}
                    <div className="bg-[#ebebeb] rounded-2xl p-8 flex flex-col border border-transparent flex-1 justify-between">
                        <div className="flex flex-col gap-4">
                            <h3 className="text-[0.8rem] font-bold text-gray-500 uppercase tracking-widest mb-2">Profile Details</h3>

                            <div className="flex justify-between items-center py-3 border-b border-gray-200/60">
                                <span className="text-gray-500 font-bold text-[0.9rem]">Identifier</span>
                                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg max-w-[60%]">
                                    <span className="text-gray-900 font-bold text-[0.9rem] truncate">
                                        {companyId || "acme-global"}
                                    </span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center py-3 border-b border-gray-200/60">
                                <span className="text-gray-500 font-bold text-[0.9rem]">Network</span>
                                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg">
                                    <Globe size={16} className="text-blue-400" />
                                    <span className="text-gray-900 font-bold text-[0.9rem]">Solana</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center py-3 border-b border-gray-200/60">
                                <span className="text-gray-500 font-bold text-[0.9rem]">Network Fee</span>
                                <span className="text-gray-900 font-bold text-[0.9rem] bg-white px-3 py-1.5 rounded-lg">~0.000005 SOL</span>
                            </div>
                        </div>

                        <div className="flex gap-4 items-start bg-white rounded-xl p-4 mt-8">
                            <ShieldCheck className="text-gray-400 mt-0.5 shrink-0" size={20} />
                            <div className="flex flex-col gap-1">
                                <span className="text-gray-900 font-bold text-[0.9rem]">On-chain Security</span>
                                <span className="text-gray-500 text-[0.8rem] leading-relaxed">Registering creates an on-chain PDA account linked to your wallet.</span>
                            </div>
                        </div>
                    </div>
                </form>
            )}

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 max-w-sm w-full animate-in fade-in slide-in-from-bottom-5
                         bg-white border rounded-xl shadow-lg px-5 py-4
                         ${toast.type === "success" ? "border-l-4 border-l-emerald-500 border-gray-200" : "border-l-4 border-l-red-500 border-gray-200"}`}>
                    <p className="font-bold text-[0.9rem] text-gray-900 mb-0.5 flex items-center gap-2">
                        {toast.type === "success" ? <span className="text-emerald-500">✓ Success</span> : <span className="text-red-500">✕ Error</span>}
                    </p>
                    <p className="text-[0.83rem] text-gray-600 font-medium break-all">{toast.msg}</p>
                </div>
            )}
        </div>
    );
};
