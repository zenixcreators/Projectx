import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

interface RecentAnalysis {
  channelId: string;
  channelName: string;
  thumbnailUrl: string;
  growthPhase: "exploding" | "growing" | "stable" | "declining";
  healthScore: number;
  niche: string;
  analysedAt: string;
}

export default function ChannelAnalysis() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recent, setRecent] = useState<RecentAnalysis[]>([]);
  
  // Progress states
  const [activeStep, setActiveStep] = useState<"resolving" | "fetching" | "details" | "calculating" | "generating" | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  const navigate = useNavigate();

  // Load recent reports on mount
  useEffect(() => {
    fetchRecent();
  }, []);

  const fetchRecent = async () => {
    try {
      const res = await axios.get("/api/channel/recent");
      setRecent(res.data || []);
    } catch (err: any) {
      console.error("Failed to load recent analyses", err);
    }
  };

  const validateUrl = (input: string): boolean => {
    const trimmed = input.trim();
    if (!trimmed) {
      setError("Please enter a YouTube channel URL or @handle");
      return false;
    }
    if (trimmed.startsWith("@")) return true;
    if (trimmed.includes("youtube.com/")) return true;
    
    setError("Please enter a valid handle (e.g. @mrbeast) or full channel link.");
    return false;
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validateUrl(url)) return;

    setLoading(true);
    setActiveStep("resolving");
    setStatusMessage("Connecting to YouTube scanner service...");

    try {
      const response = await fetch("/api/channel/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url: url.trim() })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || "Server failed to initiate channel audit.");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (reader) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const cleanLine = line.trim();
          if (cleanLine.startsWith("data: ")) {
            const dataStr = cleanLine.substring(6).trim();
            if (!dataStr) continue;

            const parsed = JSON.parse(dataStr);
            if (parsed.type === "progress") {
              setActiveStep(parsed.step);
              setStatusMessage(parsed.label);
            } else if (parsed.type === "done") {
              setLoading(false);
              navigate(`/channel-analysis/${parsed.report.channelId}`);
              return;
            } else if (parsed.type === "error") {
              throw new Error(parsed.message);
            }
          }
        }
      }
    } catch (err: any) {
      console.error("Streaming analysis failed:", err);
      setError(err.message || "An unexpected error occurred during channel audit.");
      setLoading(false);
      setActiveStep(null);
      setStatusMessage("");
    }
  };

  // Steps indicator configuration
  const steps = [
    { key: "resolving", label: "Resolve URL" },
    { key: "fetching", label: "Crawl Videos" },
    { key: "details", label: "Fetch Stats" },
    { key: "calculating", label: "Crunch Metrics" },
    { key: "generating", label: "AI Audit Report" }
  ];

  const getStepIndex = (key: string | null) => {
    if (!key) return -1;
    return steps.findIndex(s => s.key === key);
  };

  const currentStepIndex = getStepIndex(activeStep);

  const getGrowthBadgeColor = (phase: string) => {
    switch (phase) {
      case "exploding": return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
      case "growing": return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      case "stable": return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
      default: return "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20";
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-start px-4 py-12 md:py-16 selection:bg-indigo-500/30 font-sans">
      <div className="w-full max-w-4xl flex flex-col gap-10">
        
        {/* Header Block */}
        <div className="text-center flex flex-col items-center gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold tracking-wider uppercase">
            ⚡ Intelligence Center
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Channel & Competitor Analysis
          </h1>
          <p className="text-zinc-400 max-w-xl text-base md:text-lg">
            Paste any YouTube channel link or @handle. Get instant calculated metrics, niche mapping, growth velocities, and full Llama-powered competitor strategy reports.
          </p>
        </div>

        {/* Audit Search Box */}
        <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-2xl flex flex-col gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/5 rounded-full filter blur-[80px]" />
          
          <form onSubmit={handleAnalyze} className="relative flex flex-col md:flex-row gap-3 w-full">
            <div className="flex-1 relative">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="e.g. https://www.youtube.com/@MrBeast or /channel/UC..."
                disabled={loading}
                className="w-full px-5 py-4 bg-zinc-950/80 border border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-zinc-100 placeholder-zinc-500 disabled:opacity-50 text-sm md:text-base shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-indigo-800/50 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed text-sm md:text-base border border-indigo-400/20"
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Auditing Niche...
                </>
              ) : (
                "Run AI Analysis"
              )}
            </button>
          </form>

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm flex items-center gap-2 animate-pulse">
              ⚠️ {error}
            </div>
          )}

          {/* Real-time Streaming Stepper */}
          {loading && (
            <div className="flex flex-col gap-6 mt-4 p-5 bg-zinc-950/40 rounded-xl border border-zinc-800/50">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                </span>
                <span className="text-sm font-semibold text-indigo-400 tracking-wide uppercase">Live Progress Stream</span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full">
                {steps.map((step, idx) => {
                  const isActive = idx === currentStepIndex;
                  const isCompleted = idx < currentStepIndex;
                  return (
                    <div 
                      key={step.key} 
                      className={`flex flex-col gap-2 p-3 rounded-lg border transition-all duration-300 ${
                        isActive 
                          ? "bg-indigo-500/10 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.1)]" 
                          : isCompleted 
                            ? "bg-emerald-500/5 border-emerald-500/20 opacity-80" 
                            : "bg-zinc-900/30 border-zinc-800/40 opacity-40"
                      }`}
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-500 font-mono">0{idx + 1}</span>
                        {isCompleted ? (
                          <span className="text-emerald-400 font-bold">✓</span>
                        ) : isActive ? (
                          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        ) : null}
                      </div>
                      <span className={`text-xs md:text-sm font-semibold truncate ${isActive ? "text-indigo-300" : isCompleted ? "text-emerald-300" : "text-zinc-400"}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p className="text-zinc-400 text-sm italic text-center font-mono mt-1">
                {statusMessage}
              </p>
            </div>
          )}
        </div>

        {/* Recent Audits Table Grid */}
        <div className="flex flex-col gap-6">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            📊 Recent Channel Reports
          </h2>

          {recent.length === 0 ? (
            <div className="p-12 border border-dashed border-zinc-800 rounded-2xl text-center text-zinc-500">
              No channels analyzed yet. Paste a handle above to scan!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recent.map((rep) => (
                <div
                  key={rep.channelId}
                  onClick={() => navigate(`/channel-analysis/${rep.channelId}`)}
                  className="bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700/60 rounded-xl p-5 cursor-pointer transition-all duration-300 flex items-center gap-4 hover:-translate-y-0.5 shadow-md hover:shadow-lg"
                >
                  <img
                    src={rep.thumbnailUrl}
                    alt={rep.channelName}
                    className="w-12 h-12 rounded-xl object-cover border border-zinc-700 bg-zinc-950"
                  />
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <h3 className="text-sm md:text-base font-bold text-zinc-100 truncate">
                      {rep.channelName}
                    </h3>
                    <p className="text-xs text-zinc-500 truncate">{rep.niche}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${getGrowthBadgeColor(rep.growthPhase)}`}>
                        {rep.growthPhase}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {new Date(rep.analysedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="text-lg font-mono font-bold text-indigo-400">
                      {rep.healthScore}
                    </div>
                    <span className="text-[9px] uppercase font-bold text-zinc-600 tracking-widest">
                      Score
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
