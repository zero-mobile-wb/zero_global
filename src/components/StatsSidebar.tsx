import React, { useMemo } from "react";
import { X, TrendingUp, TrendingDown, Scale, BarChart2 } from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import type { TxLogData, SubAccountData } from "../hooks/useZeroGlobal";
import logo from "../assets/logo.png";

const DONUT_COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4'];

interface StatsSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    transactionLogs: TxLogData[];
    subAccounts: SubAccountData[];
}

const CustomAreaTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-gray-900 text-white p-4 rounded-xl shadow-xl flex flex-col gap-3 min-w-[200px] border border-gray-800">
                <p className="text-gray-400 text-[0.75rem] font-bold uppercase tracking-widest">{data.date}</p>
                <div className="flex flex-col gap-1">
                    <p className="text-[0.7rem] text-gray-400 font-medium">Net Flow Position</p>
                    <p className="text-2xl font-extrabold">${data.cumulative.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-800">
                        <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-bold">
                            <TrendingUp size={14} /> ${data.deposits.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                        <div className="flex items-center gap-1.5 text-red-400 text-sm font-bold">
                            <TrendingDown size={14} /> ${data.withdrawals.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-gray-900 text-white p-3 rounded-xl shadow-xl flex flex-col gap-1 min-w-[150px] border border-gray-800">
                <p className="text-gray-400 text-[0.75rem] font-bold uppercase tracking-widest">{data.name}</p>
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.fill }}></span>
                    <p className="text-xl font-extrabold">${data.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
            </div>
        );
    }
    return null;
};

export const StatsSidebar: React.FC<StatsSidebarProps> = ({
    isOpen,
    onClose,
    transactionLogs,
    subAccounts,
}) => {
    // 1. Process data for Line Chart (Deposits vs Withdrawals over time)
    const areaChartData = useMemo(() => {
        const chronologicalLogs = [...transactionLogs].sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

        const dailyData: Record<string, { date: string; deposits: number; withdrawals: number, timestamp: number }> = {};

        chronologicalLogs.forEach(log => {
            const typeKey = Object.keys(log.paymentType)[0] ?? "crossBorder";
            const isDeposit = typeKey === "deposit";
            const isWithdrawal = typeKey === "withdrawal" || typeKey === "subAccountWithdrawal" || typeKey === "crossBorder" || typeKey === "domestic" || typeKey === "subAccountExternalPayment";

            if (isDeposit || isWithdrawal) {
                const date = new Date(Number(log.timestamp) * 1000);
                const dateStr = `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}`;
                const amount = Number(log.amount) / 1e6;

                if (!dailyData[dateStr]) {
                    dailyData[dateStr] = { date: dateStr, deposits: 0, withdrawals: 0, timestamp: Number(log.timestamp) };
                }

                if (isDeposit) dailyData[dateStr].deposits += amount;
                if (isWithdrawal) dailyData[dateStr].withdrawals += amount;
            }
        });

        let cumulative = 0;
        return Object.values(dailyData)
            .sort((a, b) => a.timestamp - b.timestamp)
            .map(day => {
                cumulative += (day.deposits - day.withdrawals);
                return {
                    ...day,
                    cumulative
                };
            });
    }, [transactionLogs]);

    // 2. Process data for Pie Chart (Sub-Account Balances)
    const pieChartData = useMemo(() => {
        return subAccounts.map((sub, index) => ({
            name: sub.name,
            balance: Number(sub.balance) / 1e6,
            fill: DONUT_COLORS[index % DONUT_COLORS.length]
        })).filter(sub => sub.balance > 0);
    }, [subAccounts]);

    // 3. Numerical Analysis summary
    const analysis = useMemo(() => {
        let totalDeposited = 0;
        let totalWithdrawn = 0;

        transactionLogs.forEach(log => {
            const typeKey = Object.keys(log.paymentType)[0] ?? "crossBorder";
            const amount = Number(log.amount) / 1e6;

            if (typeKey === "deposit") totalDeposited += amount;
            if (typeKey === "withdrawal" || typeKey === "crossBorder" || typeKey === "domestic" || typeKey === "subAccountExternalPayment") {
                totalWithdrawn += amount;
            }
        });

        const netPosition = totalDeposited - totalWithdrawn;
        const totalSubBalance = subAccounts.reduce((sum, sub) => sum + (Number(sub.balance) / 1e6), 0);

        return {
            totalDeposited,
            totalWithdrawn,
            netPosition,
            totalSubBalance
        };
    }, [transactionLogs, subAccounts]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm transition-opacity duration-300">
            {/* Overlay click to close */}
            <div className="absolute inset-0" onClick={onClose} />

            {/* Sidebar Panel - Expanded to max-w-none for two columns */}
            <div className="relative w-[95vw] lg:w-[90vw] max-w-none h-full bg-[#e2e2e2] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 overflow-hidden">

                {/* Header */}
                <div className="shrink-0 flex items-center justify-between px-10 py-8 bg-[#e2e2e2] border-b border-gray-300 z-10">
                    <div className="flex items-center gap-4">
                        <img src={logo} alt="Zero Global" className="h-10 w-auto object-contain" />
                        <div>
                            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-1">Treasury Analytics</h2>
                            <p className="text-[0.95rem] text-gray-600 font-medium">Comprehensive overview of your financial flow and balances.</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-colors bg-gray-50 border border-gray-200 shadow-sm"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-10 flex flex-col gap-8 flex-1 overflow-y-auto custom-scrollbar">

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative items-stretch">

                        {/* Area Chart: Treasury Cumulative Balance */}
                        <div className="lg:col-span-2 bg-[#ebebeb] rounded-2xl p-8 flex flex-col gap-6">
                            <div className="flex flex-col gap-1">
                                <h3 className="text-[0.85rem] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                    <TrendingUp size={16} className="text-gray-400" />
                                    Net Flow Timeline
                                </h3>
                                <p className="text-[0.8rem] text-gray-400 font-medium">Cumulative deposits minus withdrawals over time</p>
                            </div>

                            {areaChartData.length > 0 ? (
                                <div className="h-72 w-full mt-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={areaChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#000000" stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor="#000000" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                            <XAxis
                                                dataKey="date"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 12, fill: '#9CA3AF', fontWeight: 600 }}
                                                dy={10}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 12, fill: '#9CA3AF', fontWeight: 600 }}
                                                tickFormatter={(val) => `$${val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val}`}
                                            />
                                            <Tooltip content={<CustomAreaTooltip />} />
                                            <Area
                                                type="monotone"
                                                dataKey="cumulative"
                                                stroke="#000000"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#colorCumulative)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-72 bg-white/60 flex flex-col items-center justify-center rounded-xl border border-white/40 border-dashed gap-3 mt-2">
                                    <BarChart2 className="text-gray-300" size={32} />
                                    <span className="text-gray-400 font-medium text-sm">Not enough data to graph history.</span>
                                </div>
                            )}
                        </div>

                        {/* Donut Chart: Sub-Accounts */}
                        <div className="bg-[#ebebeb] rounded-2xl p-8 flex flex-col gap-6">
                            <div className="flex flex-col gap-1">
                                <h3 className="text-[0.85rem] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                    <Scale size={16} className="text-gray-400" />
                                    Sub-Account Distribution
                                </h3>
                                <p className="text-[0.8rem] text-gray-400 font-medium">Relative share of current sub-account balances</p>
                            </div>

                            {pieChartData.length > 0 ? (
                                <div className="h-72 w-full mt-2 relative flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Tooltip content={<CustomPieTooltip />} />
                                            <Pie
                                                data={pieChartData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={70}
                                                outerRadius={100}
                                                paddingAngle={4}
                                                dataKey="balance"
                                                cornerRadius={6}
                                                stroke="none"
                                            >
                                                {pieChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-gray-400 text-[0.7rem] font-bold uppercase tracking-widest">Total</span>
                                        <span className="text-3xl font-extrabold text-gray-900 mt-0.5">
                                            ${pieChartData.reduce((acc, curr) => acc + curr.balance, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-72 bg-white/60 flex flex-col items-center justify-center rounded-xl border border-white/40 border-dashed gap-3 mt-2">
                                    <BarChart2 className="text-gray-300" size={32} />
                                    <span className="text-gray-400 font-medium text-sm">No funded sub-accounts yet.</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Numerical Analysis Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Total Inflows */}
                        <div className="bg-[#ebebeb] rounded-2xl p-8 flex items-center justify-between group hover:shadow-md transition-shadow">
                            <div className="flex flex-col gap-2">
                                <span className="text-[0.75rem] font-bold text-gray-400 uppercase tracking-widest">Total Inflows</span>
                                <span className="text-3xl font-extrabold text-gray-900 tracking-tight">
                                    ${analysis.totalDeposited.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                <TrendingUp size={24} />
                            </div>
                        </div>

                        {/* Total Outflows */}
                        <div className="bg-[#ebebeb] rounded-2xl p-8 flex items-center justify-between group hover:shadow-md transition-shadow">
                            <div className="flex flex-col gap-2">
                                <span className="text-[0.75rem] font-bold text-gray-400 uppercase tracking-widest">Total Outflows</span>
                                <span className="text-3xl font-extrabold text-gray-900 tracking-tight">
                                    ${analysis.totalWithdrawn.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                <TrendingDown size={24} />
                            </div>
                        </div>

                        {/* Net Position */}
                        <div className="bg-black text-white rounded-2xl p-8 shadow-lg flex items-center justify-between relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:opacity-10 transition-opacity"></div>
                            <div className="flex flex-col gap-2 relative z-10">
                                <span className="text-[0.75rem] font-bold text-gray-400 uppercase tracking-widest">Net Position</span>
                                <span className="text-3xl font-extrabold text-white tracking-tight">
                                    ${analysis.netPosition.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className="text-[0.75rem] text-gray-400 font-medium">
                                    Includes <strong className="text-white">${analysis.totalSubBalance.toLocaleString()}</strong> in Sub-Accounts
                                </span>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-white/10 text-white border border-white/20 flex items-center justify-center relative z-10 shrink-0">
                                <Scale size={24} />
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
