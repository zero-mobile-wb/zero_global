import { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { HeroGlobe } from "./HeroGlobe";
import logo from "../assets/logo.png";
import { ArrowRight } from "lucide-react";

interface LandingPageProps {
    onEnterApp: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp }) => {
    const { connected } = useWallet();
    const { setVisible } = useWalletModal();

    // As soon as wallet connects, go straight to the app — no loader
    useEffect(() => {
        if (connected) {
            onEnterApp();
        }
    }, [connected, onEnterApp]);

    return (
        <div className="min-h-screen bg-[#e2e2e2] flex flex-col relative overflow-hidden font-sans">
            {/* Header */}
            <header className="absolute top-0 left-0 right-0 p-8 flex items-center justify-between z-20">
                <div className="flex items-center gap-3">
                    <img src={logo} alt="Zero Global" className="w-[42px] h-[42px] object-contain rounded-xl shadow-sm" />
                    <span className="font-extrabold text-[1.2rem] text-gray-900 tracking-tight leading-tight hidden md:block">
                        Zero Global
                    </span>
                </div>
                <button
                    onClick={() => setVisible(true)}
                    className="bg-black text-white px-6 py-3 rounded-xl font-bold text-[0.85rem] shadow-lg hover:bg-gray-800 transition-all flex items-center gap-2 hover:scale-105"
                >
                    Launch App <ArrowRight size={16} />
                </button>
            </header>

            {/* Hero Globe — bleeding off the left edge */}
            {/* 🎛️ GLOBE SIZE: adjust w-[Xpx] h-[Xpx] below to resize the globe */}
            {/* 🎛️ GLOBE POSITION: adjust -translate-x-[X%] to move left/right, top-[X%] to move up/down */}
            <div className="absolute left-0 top-[58%] -translate-y-1/2 -translate-x-[42%] w-[700px] h-[700px] md:w-[900px] md:h-[900px] lg:w-[1100px] lg:h-[1100px] opacity-90 mix-blend-multiply pointer-events-auto z-0 hidden md:flex items-center justify-center">
                <HeroGlobe />
            </div>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center md:items-end pt-24 pb-12 px-8 md:px-20 z-10 max-w-[1400px] mx-auto w-full relative min-h-screen">

                {/* Right Side: Text and CTA */}
                <div className="max-w-[620px] text-left flex flex-col items-start gap-6 z-20 w-full mt-10 md:mt-0 relative bg-white/40 md:bg-transparent backdrop-blur-md md:backdrop-blur-none p-6 md:p-0 rounded-2xl border border-white/50 md:border-none shadow-sm md:shadow-none">

                    <h1 className="text-[1.5rem] lg:text-[1.75rem] font-semibold text-gray-700 tracking-wide leading-snug text-center w-full whitespace-nowrap">
                        MAKE YOUR MONEY MOVE.
                    </h1>

                    <p className="text-[1.1rem] lg:text-[1.25rem] text-gray-700 md:text-gray-600 font-medium max-w-xl leading-relaxed">
                        Frictionless borderless payments & treasury management infrastructure for modern connected businesses globally.
                    </p>

                    <button
                        onClick={() => setVisible(true)}
                        className="group mt-6 bg-black text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:bg-gray-800 hover:shadow-2xl transition-all flex items-center gap-3 hover:-translate-y-1 active:scale-95"
                    >
                        Launch Web App <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </main>

            {/* Background decoration */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gray-50/40 rounded-full blur-[100px] -z-0 pointer-events-none"></div>
        </div>
    );
};
