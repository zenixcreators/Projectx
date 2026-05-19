import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

interface Video {
  videoId: string;
  title: string;
  views: number;
  likes: number;
  comments: number;
  url: string;
  thumbnailUrl: string;
  publishedAt: string;
}

interface Recommendation {
  priority: "High" | "Medium" | "Low";
  action: string;
  why: string;
}

interface ChannelReportData {
  channelId: string;
  channelName: string;
  channelUrl: string;
  thumbnailUrl: string;
  description: string;
  healthScore: number;
  growthPhase: "exploding" | "growing" | "stable" | "declining";
  niche: string;
  nicheSpecificity: "Very High" | "High" | "Medium" | "Low";
  summary: string;
  stats: {
    subscribers: number;
    totalViews: number;
    videoCount: number;
    joinedYear: number;
    country: string;
  };
  metrics: {
    viewVelocity: number;
    avgViewsPerVideo: number;
    avgEngagementRate: number;
    likeToViewRatio: number;
    commentToViewRatio: number;
    uploadsPerWeek: number;
    avgVideoDurationMinutes: number;
    uploadSchedule: string;
    bestPerformingLength: string;
    topKeywords: string[];
    totalVideosAnalysed: number;
  };
  contentDNA: {
    dominantTopics: string[];
    titlePatterns: string;
  };
  engagementQuality: {
    rating: "Excellent" | "Strong" | "Average" | "Weak";
    benchmark: string;
    notes: string;
  };
  topVideos: Video[];
  contentGaps: string[];
  competitorThreatLevel: "High" | "Medium" | "Low";
  threatReasoning: string;
  recommendations: Recommendation[];
  hookStrategy: string;
  thumbnailStrategy: string;
  analysedAt: string;
}

export default function ChannelReport() {
  const { channelId } = useParams<{ channelId: string }>();
  const [report, setReport] = useState<ChannelReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    if (channelId) {
      fetchReport(channelId);
    }
  }, [channelId]);

  const fetchReport = async (id: string) => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`/api/channel/report/${id}`);
      setReport(res.data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to load audit report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatNum = (num: number): string => {
    if (!num) return "0";
    if (num >= 1000000) return (num / 1000000).toFixed(2) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toLocaleString();
  };

  const getGrowthColor = (phase: string) => {
    switch (phase) {
      case "exploding": return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      case "growing": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "stable": return "bg-indigo-500/10 text-indigo-400 border-indigo-500/30";
      default: return "bg-zinc-500/10 text-zinc-400 border-zinc-500/30";
    }
  };

  const getThreatColor = (level: string) => {
    switch (level) {
      case "High": return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
      case "Medium": return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      default: return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
    }
  };

  const getRecommendationBorder = (priority: string) => {
    switch (priority) {
      case "High": return "border-l-4 border-l-rose-500 border-zinc-800 bg-rose-500/[0.02]";
      case "Medium": return "border-l-4 border-l-amber-500 border-zinc-800 bg-amber-500/[0.02]";
      default: return "border-l-4 border-l-indigo-500 border-zinc-800 bg-indigo-500/[0.02]";
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "High": return "bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px]";
      case "Medium": return "bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px]";
      default: return "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px]";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center gap-4">
        <span className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-zinc-400 font-mono text-sm animate-pulse">Loading channel intelligence audit...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center gap-6 px-4">
        <div className="text-5xl">⚠️</div>
        <h2 className="text-2xl font-bold">Failed to Load Audit</h2>
        <p className="text-zinc-400 text-center max-w-md">{error || "No data was fetched."}</p>
        <button
          onClick={() => navigate("/channel-analysis")}
          className="px-6 py-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white font-bold rounded-xl transition cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-indigo-500/30 font-sans pb-24">
      
      {/* Top Banner Nav */}
      <div className="border-b border-zinc-900 bg-zinc-950/60 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => navigate("/channel-analysis")}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 transition cursor-pointer font-semibold group"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Dashboard
        </button>
        <div className="text-xs text-zinc-500 font-mono">
          Last Scanned: {new Date(report.analysedAt).toLocaleString()}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-8 flex flex-col gap-8">
        
        {/* HERO SECTION */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full filter blur-[100px]" />
          
          <div className="flex items-center gap-5 relative">
            <img
              src={report.thumbnailUrl}
              alt={report.channelName}
              className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover border border-zinc-700 bg-zinc-950"
            />
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                  {report.channelName}
                </h1>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${getGrowthColor(report.growthPhase)}`}>
                  {report.growthPhase}
                </span>
              </div>
              <p className="text-sm text-zinc-400 flex items-center gap-1.5">
                <span className="font-semibold text-indigo-400">Niche:</span> {report.niche}
                <span className="text-zinc-600">•</span>
                <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-medium">Specificity: {report.nicheSpecificity}</span>
              </p>
              <p className="text-xs text-zinc-500 max-w-xl mt-1 leading-relaxed line-clamp-2">
                {report.description || "No description loaded."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 relative">
            <div className="flex flex-col items-center justify-center w-24 h-24 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 shadow-inner">
              <span className="text-3xl font-mono font-extrabold text-indigo-400">{report.healthScore}</span>
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Health</span>
            </div>
            <div className="flex flex-col items-center justify-center w-24 h-24 rounded-2xl bg-zinc-950 border border-zinc-800">
              <span className="text-base font-mono font-bold text-zinc-300">{report.metrics.viewVelocity}x</span>
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Velocity</span>
            </div>
          </div>
        </div>

        {/* SUMMARY EXECUTIVE STATEMENT */}
        <div className="p-5 rounded-xl border border-indigo-500/10 bg-indigo-500/[0.01] text-indigo-300/90 text-sm md:text-base leading-relaxed italic">
          💡 <span className="font-semibold text-indigo-200">AI Summary:</span> {report.summary}
        </div>

        {/* KEY STATISTICS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Subscribers", val: formatNum(report.stats.subscribers) },
            { label: "Total Views", val: formatNum(report.stats.totalViews) },
            { label: "Video Count", val: formatNum(report.stats.videoCount) },
            { label: "Joined Year", val: report.stats.joinedYear || "N/A" }
          ].map((st, i) => (
            <div key={i} className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-5 shadow-sm">
              <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider">{st.label}</span>
              <h2 className="text-2xl font-extrabold font-mono text-zinc-100 mt-2">{st.val}</h2>
            </div>
          ))}
        </div>

        {/* METRICS CARD ROW */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "Avg Views / Video", val: formatNum(report.metrics.avgViewsPerVideo), desc: "Average view score per upload" },
            { label: "Engagement Rate", val: report.metrics.avgEngagementRate + "%", desc: "Likes + Comments relative to views" },
            { label: "Upload Frequency", val: report.metrics.uploadsPerWeek + "/wk", desc: `Upload rhythm (${report.metrics.uploadSchedule})` },
            { label: "Avg Video Length", val: report.metrics.avgVideoDurationMinutes + "m", desc: `Best length: ${report.metrics.bestPerformingLength}` }
          ].map((mt, i) => (
            <div key={i} className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider">{mt.label}</span>
                <h2 className="text-2xl font-extrabold font-mono text-indigo-400 mt-2">{mt.val}</h2>
              </div>
              <p className="text-[10px] text-zinc-500 mt-3">{mt.desc}</p>
            </div>
          ))}
        </div>

        {/* TWO-COLUMN STRATEGIC SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* CONTENT DNA */}
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-5">
            <h3 className="text-lg font-bold border-b border-zinc-800 pb-3 flex items-center gap-2">
              🧬 Content DNA Analysis
            </h3>
            
            <div className="flex flex-col gap-4">
              <div>
                <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider block mb-2">Dominant Niche Topics</span>
                <div className="flex flex-wrap gap-2">
                  {report.contentDNA.dominantTopics.map((t, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-semibold">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="mt-2">
                <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider block mb-1">Observed Title Patterns</span>
                <p className="text-sm text-zinc-300 leading-relaxed font-mono bg-zinc-950 p-3 rounded-lg border border-zinc-800/80">
                  {report.contentDNA.titlePatterns}
                </p>
              </div>
            </div>
          </div>

          {/* ENGAGEMENT QUALITY */}
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4">
            <h3 className="text-lg font-bold border-b border-zinc-800 pb-3 flex items-center gap-2">
              💬 Engagement Quality Index
            </h3>
            
            <div className="flex justify-between items-center bg-zinc-950 p-4 rounded-xl border border-zinc-800">
              <div className="flex flex-col">
                <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Audience Rating</span>
                <span className="text-xl font-extrabold text-emerald-400 mt-1">{report.engagementQuality.rating}</span>
              </div>
              <div className="text-right flex flex-col max-w-[60%]">
                <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Benchmark</span>
                <span className="text-xs text-zinc-400 mt-1 font-semibold italic">{report.engagementQuality.benchmark}</span>
              </div>
            </div>

            <p className="text-sm text-zinc-300 leading-relaxed mt-2">
              {report.engagementQuality.notes}
            </p>
          </div>
        </div>

        {/* COMPETITOR ANALYSIS & THREAT LEVEL */}
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <h3 className="text-lg font-bold flex items-center gap-2">
              🎯 Competitor Threat Assessment
            </h3>
            <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider border ${getThreatColor(report.competitorThreatLevel)}`}>
              Threat Level: {report.competitorThreatLevel}
            </span>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">
            {report.threatReasoning}
          </p>
        </div>

        {/* CONTENT GAPS & REC GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* CONTENT GAPS */}
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4">
            <h3 className="text-lg font-bold border-b border-zinc-800 pb-3 text-rose-400 flex items-center gap-2">
              ⚠️ High-Potential Content Gaps
            </h3>
            <ul className="flex flex-col gap-3">
              {report.contentGaps.map((gap, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-300">
                  <span className="text-rose-500 mt-0.5 font-bold">↳</span>
                  <span className="leading-relaxed">{gap}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* ACTIONABLE RECOMMENDATIONS */}
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4">
            <h3 className="text-lg font-bold border-b border-zinc-800 pb-3 text-emerald-400 flex items-center gap-2">
              🚀 Priority Action Plan
            </h3>
            <div className="flex flex-col gap-3">
              {report.recommendations.map((rec, i) => (
                <div key={i} className={`p-4 rounded-xl border ${getRecommendationBorder(rec.priority)}`}>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-sm font-bold text-zinc-100">{rec.action}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded font-extrabold uppercase tracking-wider ${getPriorityBadge(rec.priority)}`}>
                      {rec.priority}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed italic">
                    {rec.why}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* HOOK & THUMBNAIL STRATEGIES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-3">
            <h3 className="text-lg font-bold border-b border-zinc-800 pb-3 flex items-center gap-2 text-indigo-400">
              🪝 Psychological Hook Strategy
            </h3>
            <p className="text-sm text-zinc-300 leading-relaxed">
              {report.hookStrategy}
            </p>
          </div>
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-3">
            <h3 className="text-lg font-bold border-b border-zinc-800 pb-3 flex items-center gap-2 text-indigo-400">
              🎨 Thumbnail & Framing Strategy
            </h3>
            <p className="text-sm text-zinc-300 leading-relaxed">
              {report.thumbnailStrategy}
            </p>
          </div>
        </div>

        {/* TOP VIDEOS TABLE */}
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4 shadow-sm overflow-hidden">
          <h3 className="text-lg font-bold border-b border-zinc-800 pb-3 flex items-center gap-2">
            🏆 Top 10 Performing Videos
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800/80 text-xs text-zinc-500 uppercase font-bold tracking-wider">
                  <th className="py-3 px-4">Video Info</th>
                  <th className="py-3 px-4 text-right">Views</th>
                  <th className="py-3 px-4 text-right">Likes</th>
                  <th className="py-3 px-4 text-right">Comments</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {report.topVideos.map((vid, idx) => (
                  <tr key={idx} className="border-b border-zinc-900 hover:bg-zinc-900/20 transition-all">
                    <td className="py-4 px-4 flex items-center gap-3 min-w-[280px] max-w-[450px]">
                      <img
                        src={vid.thumbnailUrl}
                        alt={vid.title}
                        className="w-16 h-10 rounded object-cover border border-zinc-800 bg-zinc-950"
                      />
                      <div className="flex flex-col gap-0.5 truncate">
                        <span className="text-xs md:text-sm font-bold text-zinc-200 truncate leading-relaxed">
                          {vid.title}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {new Date(vid.publishedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-xs md:text-sm font-bold text-zinc-200">
                      {formatNum(vid.views)}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-xs text-zinc-400">
                      {formatNum(vid.likes)}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-xs text-zinc-400">
                      {formatNum(vid.comments)}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <a
                        href={vid.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700/80 text-[10px] font-bold uppercase tracking-wider text-zinc-200 border border-zinc-700/50 hover:border-zinc-600 transition"
                      >
                        Watch ↗
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
