import { useMemo, useState } from "react";
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./App.css";
import "./index.css";

import { WalletButton } from "./components/WalletButton";
import { Dashboard } from "./components/Dashboard";
import { RegisterCompany } from "./components/RegisterCompany";
import { DepositPanel } from "./components/DepositPanel";
import { PaymentPanel } from "./components/PaymentPanel";
import { WithdrawPanel } from "./components/WithdrawPanel";
import { TransactionHistory } from "./components/TransactionHistory";
import { LandingPage } from "./components/LandingPage";
import { useZeroGlobal } from "./hooks/useZeroGlobal";
import { LayoutDashboard, Building2, Download, Globe, Upload, List } from "lucide-react";
import logo from "./assets/logo.png";

type Tab = "dashboard" | "company" | "deposit" | "pay" | "withdraw" | "history";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { id: "company", label: "Company", icon: <Building2 size={18} /> },
  { id: "deposit", label: "Deposit", icon: <Download size={18} /> },
  { id: "pay", label: "Pay", icon: <Globe size={18} /> },
  { id: "withdraw", label: "Withdraw", icon: <Upload size={18} /> },
  { id: "history", label: "History", icon: <List size={18} /> },
];

function TreasuryApp() {
  const { connected, publicKey } = useWallet();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const {
    companyAccount,
    vaultState,
    transactionLogs,
    subAccounts,
    loading,
    initializeVault,
    registerCompany,
    deposit,
    sendPayment,
    withdraw,
    createSubAccount,
    fundSubAccount,
    withdrawFromSubAccount,
    refreshAll,
  } = useZeroGlobal();

  return (
    <div className="flex min-h-screen">

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="w-[260px] shrink-0 flex flex-col sticky top-0 h-screen
                        bg-[#ebebeb] border-r border-gray-200 shadow-sm z-10 p-2">

        {/* Brand */}
        <div className="flex flex-col gap-6 px-4 pb-6 pt-6 border-b border-gray-200/60">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Zero Global" className="w-[42px] h-[42px] object-contain rounded-xl shadow-sm" />
            <div>
              <p className="font-extrabold text-[0.95rem] text-gray-900 leading-tight">Zero Global</p>
              <p className="text-[0.7rem] text-gray-500 font-bold tracking-widest uppercase">Treasury</p>
            </div>
          </div>

          {connected && companyAccount && (
            <div className="bg-[#f6f6f6] rounded-lg p-4 shadow-sm border border-gray-100 flex flex-col gap-1.5">
              <p className="text-[0.8rem] font-bold text-gray-900 truncate">{companyAccount.companyId}</p>
              <div>
                <p className="text-[0.65rem] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Treasury Balance</p>
                <div className="flex items-center gap-1.5">
                  <p className="text-[1.1rem] font-extrabold text-gray-900 leading-none font-sans">
                    ${companyAccount ? (Number(companyAccount.treasuryBalance) / 1000000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                  </p>
                  <img src="/usdc-logo.png" alt="USDC" className="w-4 h-4 object-contain" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-1.5 px-3 pt-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-3 py-[0.7rem] rounded-lg
                          text-[0.87rem] font-bold text-left w-full transition-all duration-150
                          ${activeTab === tab.id
                  ? "bg-[#f6f6f6] text-black shadow-sm"
                  : "bg-transparent text-gray-500 hover:bg-gray-200 hover:text-gray-900 mb-1"
                }`}
            >
              <span className="w-5 flex items-center justify-center text-base">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 pt-3 pb-5 border-t border-gray-200/60">
          <div className="flex items-center gap-2 text-[0.77rem] text-gray-500 font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] dot-pulse" />
            Devnet
          </div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-y-auto min-w-0 bg-[#e2e2e2]">

        {/* Topbar */}
        <header className="flex items-center justify-between px-6 py-4
                           sticky top-0 z-50">
          <h1 className="text-[1.05rem] font-bold text-gray-900 flex items-center gap-2 m-0">
            {TABS.find((t) => t.id === activeTab)?.icon}{" "}
            {TABS.find((t) => t.id === activeTab)?.label}
          </h1>
          <div className="flex items-center gap-3">
            {connected && publicKey && companyAccount && (
              <span className="bg-gray-100 border border-gray-200 rounded-lg
                               px-3 py-1.5 text-[0.78rem] font-bold text-gray-800 flex items-center gap-2">
                <Building2 size={14} /> {companyAccount.companyId}
              </span>
            )}
            <WalletButton />
          </div>
        </header>

        <div className="flex-1 p-6 w-full mx-auto">
          {activeTab === "dashboard" && (
            <Dashboard
              vaultState={vaultState}
              companyAccount={companyAccount}
              transactionLogs={transactionLogs}
              subAccounts={subAccounts}
              onRefresh={refreshAll}
              loading={loading}
              onInitialize={initializeVault}
              onNavigate={(t) => setActiveTab(t as Tab)}
              onCreateSubAccount={createSubAccount}
              onFundSubAccount={fundSubAccount}
              onWithdrawSubAccount={withdrawFromSubAccount}
            />
          )}
          {activeTab === "company" && (
            <RegisterCompany companyAccount={companyAccount}
              onRegister={registerCompany} loading={loading} />
          )}
          {activeTab === "deposit" && (
            <DepositPanel companyAccount={companyAccount}
              onDeposit={deposit} loading={loading} />
          )}
          {activeTab === "pay" && (
            <PaymentPanel companyAccount={companyAccount}
              onPayment={sendPayment} loading={loading} />
          )}
          {activeTab === "withdraw" && (
            <WithdrawPanel companyAccount={companyAccount}
              onWithdraw={withdraw} loading={loading} />
          )}
          {activeTab === "history" && (
            <TransactionHistory logs={transactionLogs}
              loading={loading} onRefresh={refreshAll} scrollable />
          )}
        </div>
      </main>
    </div>
  );
}

function AppContent() {
  const { connected } = useWallet();
  const [hasEnteredApp, setHasEnteredApp] = useState(false);

  if (!connected || !hasEnteredApp) {
    return <LandingPage onEnterApp={() => setHasEnteredApp(true)} />;
  }

  return <TreasuryApp />;
}

export default function App() {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
  ], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <AppContent />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
