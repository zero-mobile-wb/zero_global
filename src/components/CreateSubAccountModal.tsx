import React, { useState } from "react";
import { X, Save } from "lucide-react";

interface CreateSubAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string) => Promise<void>;
    loading: boolean;
}

export const CreateSubAccountModal: React.FC<CreateSubAccountModalProps> = ({ isOpen, onClose, onCreate, loading }) => {
    const [name, setName] = useState("");

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onCreate(name.trim());
        setName("");
        onClose();
    };

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
                    <h2 className="text-2xl font-extrabold text-gray-900 mb-2 tracking-tight">Create Sub-Account</h2>
                    <p className="text-gray-500 font-medium text-sm">
                        Create a dedicated sub-account to isolate funds for specific operations (e.g., Payroll, Marketing).
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <div>
                        <label className="block text-[0.8rem] font-bold text-gray-500 uppercase tracking-widest mb-2">
                            Account Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Payroll"
                            maxLength={32}
                            minLength={3}
                            required
                            className="w-full px-5 py-4 border border-gray-200 rounded-xl text-gray-900 text-[1.1rem] font-bold focus:border-black focus:ring-1 focus:ring-black outline-none transition-all placeholder:text-gray-300 placeholder:font-medium"
                        />
                        <p className="text-xs text-gray-500 mt-2 font-medium">Between 3 and 32 characters.</p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || name.trim().length < 3}
                        className="w-full bg-black text-white py-4 rounded-xl text-[1.1rem] font-bold mt-2 hover:bg-gray-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                        {loading ? "Creating..." : (
                            <>
                                <Save size={18} /> Create Account
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
