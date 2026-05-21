import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const isChannelActive = location.pathname.startsWith("/channel-analysis");
  const isScriptActive = location.pathname.startsWith("/script-generator");

  return (
    <header className="w-full sticky top-0 z-50 bg-zinc-950/70 backdrop-blur-xl border-b border-zinc-900 px-6 py-4 flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      {/* Logo Section */}
      <div 
        onClick={() => navigate("/")} 
        className="flex items-center gap-2.5 cursor-pointer group"
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/10 group-hover:scale-105 group-hover:shadow-indigo-500/25 transition-all duration-300">
          <span className="font-extrabold text-sm tracking-tighter">NX</span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-extrabold tracking-wider text-zinc-100 uppercase group-hover:text-indigo-300 transition duration-300">
            Nexus Creator Studio
          </span>
          <span className="text-[10px] text-indigo-400 font-mono tracking-widest uppercase">
            AI SaaS Suite
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex items-center bg-zinc-900/50 p-1 border border-zinc-800/80 rounded-xl gap-1">
        <button
          onClick={() => navigate("/channel-analysis")}
          className={`flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-bold rounded-lg transition-all duration-300 cursor-pointer ${
            isChannelActive
              ? "bg-zinc-800 text-indigo-400 shadow-sm border border-zinc-700/50"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30"
          }`}
        >
          <span>📊</span> Competitor Analyzer
        </button>
        <button
          onClick={() => navigate("/script-generator")}
          className={`flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-bold rounded-lg transition-all duration-300 cursor-pointer ${
            isScriptActive
              ? "bg-zinc-800 text-indigo-400 shadow-sm border border-zinc-700/50"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30"
          }`}
        >
          <span>✍️</span> Script Studio
        </button>
      </nav>

      {/* Profile / Badge Info */}
      <div className="hidden md:flex items-center gap-3">
        <div className="flex flex-col items-end">
          <span className="text-xs font-bold text-zinc-200">Premium Creator</span>
          <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
          </span>
        </div>
        <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-300 text-xs">
          CR
        </div>
      </div>
    </header>
  );
}
