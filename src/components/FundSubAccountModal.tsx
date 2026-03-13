import React, { useState } from "react";
import { X, ArrowDownToLine } from "lucide-react";
import { formatUsdc } from "../utils/formatters";

interface FundSubAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onFund: (subAccountName: string, amount: number) => Promise<void>;
    loading: boolean;
    subAccountName: string;
    maxAvailable: bigint;
}

export const FundSubAccountModal: React.FC<FundSubAccountModalProps> = ({
    isOpen, onClose, onFund, loading, subAccountName, maxAvailable
}) => {
    const [amount, setAmount] = useState("");

    if (!isOpen) return null;

    const availableFormatted = parseFloat(formatUsdc(maxAvailable));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) return;

        await onFund(subAccountName, numAmount);
        setAmount("");
        onClose();
    };

    const setMax = () => setAmount(availableFormatted.toString());

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white rounded-[2rem] p-8 w-full max-w-md relative z-10 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 transition-colors bg-gray-100 hover:bg-gray-200 p-2 rounded-full"
                >
                    <X size={20} />
                </button>

                <div className="mb-8 pr-12">
                    <h2 className="text-2xl font-extrabold text-gray-900 mb-2 tracking-tight">Fund Account</h2>
                    <p className="text-gray-500 font-medium text-sm">
                        Allocate USDC from your main treasury to the <strong className="text-gray-900">{subAccountName}</strong> balance.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <label className="block text-[0.8rem] font-bold text-gray-500 uppercase tracking-widest">
                                Amount (USDC)
                            </label>
                            <span className="text-xs font-bold text-gray-500">
                                Available: <span className="text-gray-900 font-mono">${availableFormatted.toFixed(2)}</span>
                            </span>
                        </div>

                        <div className="relative">
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                min={0.000001}
                                step="any"
                                max={availableFormatted}
                                required
                                className="w-full pl-5 pr-20 py-4 border border-gray-200 rounded-xl text-gray-900 text-[1.2rem] font-bold font-mono focus:border-black focus:ring-1 focus:ring-black outline-none transition-all placeholder:text-gray-300"
                            />
                            <button
                                type="button"
                                onClick={setMax}
                                className="absolute right-3 top-1/2 -translate-y-1/2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                            >
                                MAX
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > availableFormatted}
                        className="w-full bg-black text-white py-4 rounded-xl text-[1.1rem] font-bold mt-2 hover:bg-gray-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                        {loading ? "Processing..." : (
                            <>
                                <ArrowDownToLine size={18} /> Fund Account
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
