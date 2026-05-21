import React, { useState, useEffect } from "react";
import axios from "axios";
import Navigation from "../components/Navigation";

interface SavedScript {
  _id: string;
  type: "long" | "short";
  topic: string;
  tone: string;
  platform?: string;
  targetDuration?: string;
  scriptContent: string;
  wordCount: number;
  estimatedDuration: string;
  inputs: any;
  createdAt: string;
}

export default function ScriptGenerator() {
  const [mode, setMode] = useState<"long" | "short">("long");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [savedScripts, setSavedScripts] = useState<SavedScript[]>([]);

  // Generated Output state
  const [generatedScript, setGeneratedScript] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<{
    type: "long" | "short";
    wordCount: number;
    estimatedDuration: string;
    sectionsMatch?: boolean;
  } | null>(null);

  // Form Inputs — Long Form
  const [longTopic, setLongTopic] = useState("");
  const [longAudience, setLongAudience] = useState("");
  const [longTone, setLongTone] = useState("Educational");
  const [longDuration, setLongDuration] = useState("5–10 min");
  const [longSectionCount, setLongSectionCount] = useState(5);
  const [longHookStyle, setLongHookStyle] = useState("Question");
  const [longIncludeBRoll, setLongIncludeBRoll] = useState(true);
  const [longIncludeTimestamps, setLongIncludeTimestamps] = useState(true);
  const [longCtaStyle, setLongCtaStyle] = useState("Subscribe CTA");
  const [longContext, setLongContext] = useState("");

  // Form Inputs — Short Form
  const [shortTopic, setShortTopic] = useState("");
  const [shortAudience, setShortAudience] = useState("");
  const [shortTone, setShortTone] = useState("Conversational");
  const [shortPlatform, setShortPlatform] = useState("TikTok");
  const [shortLength, setShortLength] = useState("60 seconds (~150 words)");
  const [shortHookStyle, setShortHookStyle] = useState("Bold Claim");
  const [shortPacingStyle, setShortPacingStyle] = useState("Fast Cut (punchy, fragmented)");
  const [shortIncludeText, setShortIncludeText] = useState(true);
  const [shortCtaStyle, setShortCtaStyle] = useState("Follow for more");
  const [shortContext, setShortContext] = useState("");

  // Track expanded sections in Long-Form output
  const [expandedSections, setExpandedSections] = useState<{ [key: number]: boolean }>({});

  // Loading Status messages rotation
  const [statusMessage, setStatusMessage] = useState("Connecting to brain matrix...");

  useEffect(() => {
    fetchSavedScripts();
  }, []);

  useEffect(() => {
    if (!loading) return;
    const messages = [
      "Analyzing topic dynamics...",
      "Scattering visual B-roll markers...",
      "Polishing scroll-stopping hooks...",
      "Structuring spoken rhythm patterns...",
      "Engineering audience retention multipliers...",
      "Injecting dynamic Call-To-Actions...",
      "Finalizing high-performing content output..."
    ];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % messages.length;
      setStatusMessage(messages[idx]);
    }, 2500);
    return () => clearInterval(interval);
  }, [loading]);

  const fetchSavedScripts = async () => {
    try {
      const res = await axios.get("/api/scripts");
      setSavedScripts(res.data || []);
    } catch (err) {
      console.error("Failed to load saved scripts library", err);
    }
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    setSuccessMsg("");

    const currentTopic = mode === "long" ? longTopic : shortTopic;
    if (!currentTopic.trim()) {
      setError("Topic / Title is a required field!");
      return;
    }

    setLoading(true);
    setStatusMessage("Activating Llama 3.3 script model...");
    setGeneratedScript(null);
    setMetadata(null);

    const payload = mode === "long" 
      ? {
          type: "long",
          topic: longTopic.trim(),
          audience: longAudience.trim() || "general creators",
          tone: longTone,
          hookStyle: longHookStyle,
          ctaStyle: longCtaStyle,
          additionalContext: longContext.trim(),
          targetDuration: longDuration,
          sectionCount: Number(longSectionCount) || 5,
          includeBRoll: longIncludeBRoll,
          includeTimestamps: longIncludeTimestamps
        }
      : {
          type: "short",
          topic: shortTopic.trim(),
          audience: shortAudience.trim() || "general viewers",
          tone: shortTone,
          platform: shortPlatform,
          targetLength: shortLength,
          hookStyle: shortHookStyle,
          pacingStyle: shortPacingStyle,
          includeOnScreenText: shortIncludeText,
          ctaStyle: shortCtaStyle,
          additionalContext: shortContext.trim()
        };

    try {
      const res = await axios.post("/api/script/generate", payload);
      if (res.data?.success) {
        setGeneratedScript(res.data.script);
        setMetadata(res.data.metadata);
        
        // Auto-expand first few sections for long form
        if (mode === "long") {
          setExpandedSections({ 0: true, 1: true, 2: true });
        }
      } else {
        throw new Error(res.data?.error || "Could not generate script.");
      }
    } catch (err: any) {
      console.error("Script generation failed:", err);
      setError(err.response?.data?.error || err.message || "Failed to generate script. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!generatedScript || !metadata) return;
    setError("");
    setSuccessMsg("");

    const inputsSnapshot = mode === "long" 
      ? {
          longTopic,
          longAudience,
          longTone,
          longDuration,
          longSectionCount,
          longHookStyle,
          longIncludeBRoll,
          longIncludeTimestamps,
          longCtaStyle,
          longContext
        }
      : {
          shortTopic,
          shortAudience,
          shortTone,
          shortPlatform,
          shortLength,
          shortHookStyle,
          shortPacingStyle,
          shortIncludeText,
          shortCtaStyle,
          shortContext
        };

    const savePayload = {
      type: mode,
      topic: mode === "long" ? longTopic.trim() : shortTopic.trim(),
      tone: mode === "long" ? longTone : shortTone,
      platform: mode === "short" ? shortPlatform : undefined,
      targetDuration: mode === "long" ? longDuration : undefined,
      scriptContent: generatedScript,
      wordCount: metadata.wordCount,
      estimatedDuration: metadata.estimatedDuration,
      inputs: inputsSnapshot
    };

    try {
      const res = await axios.post("/api/scripts/save", savePayload);
      if (res.data?.success) {
        setSuccessMsg("Script successfully saved to library!");
        fetchSavedScripts();
      } else {
        throw new Error(res.data?.error || "Save endpoint reported failure.");
      }
    } catch (err: any) {
      console.error("Failed to save script:", err);
      setError(err.response?.data?.error || err.message || "Failed to save script to library.");
    }
  };

  const handleCopyClipboard = () => {
    if (!generatedScript) return;
    // Clean tags if copying for raw usage
    const cleanText = generatedScript
      .replace(/\[B-ROLL:\s*([^\]]+)\]/gi, "(B-ROLL: $1)")
      .replace(/\[TEXT:\s*["']?([^\]"']+)["']?\]/gi, '(TEXT overlay: "$1")');
    
    navigator.clipboard.writeText(cleanText)
      .then(() => {
        setSuccessMsg("Copied clean script text to clipboard!");
        setTimeout(() => setSuccessMsg(""), 3000);
      })
      .catch((err) => {
        console.error("Clipboard copy failed:", err);
        setError("Failed to copy to clipboard.");
      });
  };

  const handleLoadSavedScript = (script: SavedScript) => {
    setMode(script.type);
    setGeneratedScript(script.scriptContent);
    setMetadata({
      type: script.type,
      wordCount: script.wordCount,
      estimatedDuration: script.estimatedDuration,
      sectionsMatch: script.inputs?.longSectionCount ? true : undefined
    });

    // Populate the forms
    if (script.type === "long") {
      setLongTopic(script.topic);
      setLongAudience(script.inputs?.longAudience || "");
      setLongTone(script.tone);
      setLongDuration(script.targetDuration || "5–10 min");
      setLongSectionCount(script.inputs?.longSectionCount || 5);
      setLongHookStyle(script.inputs?.longHookStyle || "Question");
      setLongIncludeBRoll(script.inputs?.longIncludeBRoll !== false);
      setLongIncludeTimestamps(script.inputs?.longIncludeTimestamps !== false);
      setLongCtaStyle(script.inputs?.longCtaStyle || "Subscribe CTA");
      setLongContext(script.inputs?.longContext || "");
      setExpandedSections({ 0: true, 1: true, 2: true });
    } else {
      setShortTopic(script.topic);
      setShortAudience(script.inputs?.shortAudience || "");
      setShortTone(script.tone);
      setShortPlatform(script.platform || "TikTok");
      setShortLength(script.inputs?.shortLength || "60 seconds (~150 words)");
      setShortHookStyle(script.inputs?.shortHookStyle || "Bold Claim");
      setShortPacingStyle(script.inputs?.shortPacingStyle || "Fast Cut (punchy, fragmented)");
      setShortIncludeText(script.inputs?.shortIncludeText !== false);
      setShortCtaStyle(script.inputs?.shortCtaStyle || "Follow for more");
      setShortContext(script.inputs?.shortContext || "");
    }

    // Scroll smoothly to output display
    const outputElem = document.getElementById("studio-output");
    if (outputElem) {
      outputElem.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Parsing Helpers
  const parseLongForm = (text: string) => {
    const regex = /\[(?:\d{2}:\d{2})\]\s*\[(?:HOOK|INTRO|SECTION|OUTRO|OUTRO \/ CTA)[^\]]*\]|\[(?:HOOK|INTRO|SECTION|OUTRO|OUTRO \/ CTA)[^\]]*\]/gi;
    
    const sections: { header: string; timestamp: string | null; body: string }[] = [];
    const matches: { index: number; text: string }[] = [];
    
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        index: match.index,
        text: match[0]
      });
    }
    
    if (matches.length === 0) {
      return {
        firstNonSectionText: "",
        sections: [{
          header: "Script Content",
          timestamp: null,
          body: text
        }]
      };
    }
    
    const firstNonSectionText = text.substring(0, matches[0].index).trim();
    
    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const next = matches[i + 1];
      const start = current.index + current.text.length;
      const end = next ? next.index : text.length;
      const body = text.substring(start, end).trim();
      
      const tsMatch = current.text.match(/\[(\d{2}:\d{2})\]/);
      const timestamp = tsMatch ? tsMatch[1] : null;
      
      let cleanHeader = current.text.replace(/\[\d{2}:\d{2}\]/, "").replace(/[\[\]]/g, "").trim();
      
      sections.push({
        header: cleanHeader,
        timestamp,
        body
      });
    }
    
    return { firstNonSectionText, sections };
  };

  const parseShortForm = (text: string) => {
    const regex = /\[(?:HOOK|BODY|CTA)\]/gi;
    const sections: { [key: string]: string } = {
      hook: "",
      body: "",
      cta: ""
    };
    
    const matches: { index: number; label: string; text: string }[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      const matchedText = match[0].toUpperCase();
      let label = "hook";
      if (matchedText.includes("BODY")) label = "body";
      if (matchedText.includes("CTA")) label = "cta";
      
      matches.push({
        index: match.index,
        label,
        text: match[0]
      });
    }
    
    if (matches.length === 0) {
      return {
        hook: "",
        body: text,
        cta: ""
      };
    }
    
    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const next = matches[i + 1];
      const start = current.index + current.text.length;
      const end = next ? next.index : text.length;
      const body = text.substring(start, end).trim();
      
      sections[current.label] = body;
    }
    
    return sections;
  };

  // Rendering Helpers
  const renderLongFormText = (text: string) => {
    const bRollRegex = /\[B-ROLL:\s*([^\]]+)\]/gi;
    const parts = [];
    let lastIndex = 0;
    let match;
    
    while ((match = bRollRegex.exec(text)) !== null) {
      const textBefore = text.substring(lastIndex, match.index);
      if (textBefore) {
        parts.push({ type: "text", content: textBefore });
      }
      parts.push({ type: "b-roll", content: match[1] });
      lastIndex = bRollRegex.lastIndex;
    }
    
    const remainingText = text.substring(lastIndex);
    if (remainingText) {
      parts.push({ type: "text", content: remainingText });
    }
    
    if (parts.length === 0) {
      return <div className="text-zinc-300 whitespace-pre-wrap">{text}</div>;
    }
    
    return (
      <div className="space-y-3 text-zinc-300 leading-relaxed text-sm md:text-base font-normal">
        {parts.map((part, idx) => {
          if (part.type === "b-roll") {
            return (
              <div 
                key={idx} 
                className="my-3 p-3.5 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 text-indigo-300 flex items-start gap-2.5 shadow-sm group hover:border-indigo-500/40 transition duration-300"
              >
                <span className="text-lg select-none">🎬</span>
                <div className="flex-1">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 block mb-0.5 select-none">
                    Visual Cue / B-Roll
                  </span>
                  <span className="text-sm font-medium italic">{part.content}</span>
                </div>
              </div>
            );
          } else {
            return part.content.split('\n').map((para, pIdx) => {
              const trimmed = para.trim();
              if (!trimmed) return null;
              return <p key={`${idx}-${pIdx}`} className="mb-2.5">{trimmed}</p>;
            });
          }
        })}
      </div>
    );
  };

  const renderShortFormText = (text: string) => {
    const textRegex = /\[TEXT:\s*["']?([^\]"']+)["']?\]/gi;
    const parts = [];
    let lastIndex = 0;
    let match;
    
    while ((match = textRegex.exec(text)) !== null) {
      const textBefore = text.substring(lastIndex, match.index);
      if (textBefore) {
        parts.push({ type: "text", content: textBefore });
      }
      parts.push({ type: "text-overlay", content: match[1] });
      lastIndex = textRegex.lastIndex;
    }
    
    const remainingText = text.substring(lastIndex);
    if (remainingText) {
      parts.push({ type: "text", content: remainingText });
    }
    
    if (parts.length === 0) {
      return <div className="text-zinc-300 whitespace-pre-wrap">{text}</div>;
    }
    
    return (
      <div className="space-y-2 text-zinc-300 leading-relaxed text-sm md:text-base font-normal">
        {parts.map((part, idx) => {
          if (part.type === "text-overlay") {
            return (
              <span 
                key={idx} 
                className="inline-flex items-center gap-1 px-2 py-0.5 my-1 mx-1 rounded bg-purple-500/15 border border-purple-500/35 text-purple-300 font-bold text-xs tracking-wider uppercase select-none shadow-sm cursor-help hover:bg-purple-500/25 transition duration-200"
                title="On-Screen Text Suggestion"
              >
                💬 "{part.content}"
              </span>
            );
          } else {
            return <span key={idx}>{part.content}</span>;
          }
        })}
      </div>
    );
  };

  const toggleSection = (idx: number) => {
    setExpandedSections(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans pb-24 selection:bg-indigo-500/30">
      <Navigation />

      <main className="w-full flex flex-col items-center justify-start px-4 py-12 md:py-16">
        <div className="w-full max-w-4xl flex flex-col gap-10">

          {/* Header Block */}
          <div className="text-center flex flex-col items-center gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold tracking-wider uppercase">
              ⚡ Script Studio v2
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              Viral Video Script Generator
            </h1>
            <p className="text-zinc-400 max-w-xl text-base md:text-lg">
              Engineered for creators. Instantly author high-retention long-form scripts or scroll-stopping short-form scripts optimized for Reels, TikTok, and YouTube Shorts.
            </p>
          </div>

          {/* Mode Selector Pill Toggle */}
          <div className="flex justify-center w-full">
            <div className="relative bg-zinc-900 border border-zinc-800 p-1 rounded-2xl flex w-full max-w-xs shadow-inner">
              <div 
                className={`absolute top-1 bottom-1 rounded-xl bg-zinc-800 border border-zinc-700/50 shadow-md transition-all duration-300 w-[calc(50%-4px)] ${
                  mode === "short" ? "left-[calc(50%+2px)]" : "left-1"
                }`}
              />
              <button
                type="button"
                onClick={() => setMode("long")}
                className={`flex-1 text-center py-2.5 text-xs md:text-sm font-bold tracking-wider relative z-10 transition-colors duration-300 ${
                  mode === "long" ? "text-indigo-400 font-extrabold" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                📺 Long Form
              </button>
              <button
                type="button"
                onClick={() => setMode("short")}
                className={`flex-1 text-center py-2.5 text-xs md:text-sm font-bold tracking-wider relative z-10 transition-colors duration-300 ${
                  mode === "short" ? "text-indigo-400 font-extrabold" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                📱 Short Form
              </button>
            </div>
          </div>

          {/* Dynamic Inputs Box */}
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden transition-all duration-500">
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/5 rounded-full filter blur-[80px]" />
            
            <form onSubmit={handleGenerate} className="relative flex flex-col gap-6">
              
              {/* Common Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                    Video Topic / Title <span className="text-indigo-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={mode === "long" ? longTopic : shortTopic}
                    onChange={(e) => mode === "long" ? setLongTopic(e.target.value) : setShortTopic(e.target.value)}
                    placeholder={mode === "long" ? "e.g. How I built an AI SaaS in 48 hours as a solo founder" : "e.g. 3 AI tools that feel illegal to know"}
                    className="px-4 py-3 bg-zinc-950/80 border border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-100 placeholder-zinc-600 transition text-sm shadow-inner"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                    Target Audience
                  </label>
                  <input
                    type="text"
                    value={mode === "long" ? longAudience : shortAudience}
                    onChange={(e) => mode === "long" ? setLongAudience(e.target.value) : setShortAudience(e.target.value)}
                    placeholder={mode === "long" ? "e.g. beginner developers & tech hobbyists" : "e.g. small business owners looking to automate"}
                    className="px-4 py-3 bg-zinc-950/80 border border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-100 placeholder-zinc-600 transition text-sm shadow-inner"
                  />
                </div>
              </div>

              {/* Long Form Specific Fields */}
              {mode === "long" && (
                <div className="flex flex-col gap-6 animate-fade-in transition-all duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                        Tone
                      </label>
                      <select
                        value={longTone}
                        onChange={(e) => setLongTone(e.target.value)}
                        className="px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-300 text-sm shadow-inner cursor-pointer"
                      >
                        <option>Casual</option>
                        <option>Professional</option>
                        <option>Educational</option>
                        <option>Storytelling</option>
                        <option>Motivational</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                        Target Duration
                      </label>
                      <select
                        value={longDuration}
                        onChange={(e) => setLongDuration(e.target.value)}
                        className="px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-300 text-sm shadow-inner cursor-pointer"
                      >
                        <option>5–10 min</option>
                        <option>10–20 min</option>
                        <option>20–40 min</option>
                        <option>40–60 min</option>
                        <option>60+ min</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                        Number of Sections
                      </label>
                      <input
                        type="number"
                        min={3}
                        max={10}
                        value={longSectionCount}
                        onChange={(e) => setLongSectionCount(Math.max(3, Math.min(10, Number(e.target.value) || 5)))}
                        className="px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-300 text-sm shadow-inner"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                        Hook Style
                      </label>
                      <select
                        value={longHookStyle}
                        onChange={(e) => setLongHookStyle(e.target.value)}
                        className="px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-300 text-sm shadow-inner cursor-pointer"
                      >
                        <option value="Question">Question Hook (thought-provoking opener)</option>
                        <option value="Bold Statement">Bold Statement Hook (counterintuitive claim)</option>
                        <option value="Shocking Fact">Shocking Fact Hook (unexpected metric/stat)</option>
                        <option value="Story Open">Story Open Hook (in media res visual hook)</option>
                        <option value="Contrast Hook">Contrast Hook (success vs failure)</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                        Outro / CTA Style
                      </label>
                      <select
                        value={longCtaStyle}
                        onChange={(e) => setLongCtaStyle(e.target.value)}
                        className="px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-300 text-sm shadow-inner cursor-pointer"
                      >
                        <option value="Subscribe CTA">Subscribe CTA (channel growth focus)</option>
                        <option value="Link in Bio">Link in Bio (newsletter/link driver)</option>
                        <option value="Product Plug">Product Plug (direct service sales)</option>
                        <option value="Community CTA">Community CTA (joining server/forum)</option>
                        <option value="Soft Close">Soft Close (philosophical reflection)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 p-4 rounded-xl bg-zinc-950/40 border border-zinc-800/60">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={longIncludeBRoll}
                        onChange={(e) => setLongIncludeBRoll(e.target.checked)}
                        className="w-4.5 h-4.5 rounded border-zinc-800 bg-zinc-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-zinc-200">Include B-Roll Suggestions</span>
                        <span className="text-[10px] text-zinc-500">Injects cinematic inline visual indicators [B-ROLL: ...]</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={longIncludeTimestamps}
                        onChange={(e) => setLongIncludeTimestamps(e.target.checked)}
                        className="w-4.5 h-4.5 rounded border-zinc-800 bg-zinc-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-zinc-200">Include Timestamps</span>
                        <span className="text-[10px] text-zinc-500">Estimates section start moments automatically</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Short Form Specific Fields */}
              {mode === "short" && (
                <div className="flex flex-col gap-6 animate-fade-in transition-all duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                        Tone
                      </label>
                      <select
                        value={shortTone}
                        onChange={(e) => setShortTone(e.target.value)}
                        className="px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-300 text-sm shadow-inner cursor-pointer"
                      >
                        <option>Casual</option>
                        <option>Hype/Energetic</option>
                        <option>Educational</option>
                        <option>Storytelling</option>
                        <option>Conversational</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                        Target Platform
                      </label>
                      <select
                        value={shortPlatform}
                        onChange={(e) => setShortPlatform(e.target.value)}
                        className="px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-300 text-sm shadow-inner cursor-pointer"
                      >
                        <option>TikTok</option>
                        <option>Instagram Reels</option>
                        <option>YouTube Shorts</option>
                        <option>All Platforms</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                        Target Length
                      </label>
                      <select
                        value={shortLength}
                        onChange={(e) => setShortLength(e.target.value)}
                        className="px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-300 text-sm shadow-inner cursor-pointer"
                      >
                        <option>60 seconds (~150 words)</option>
                        <option>90 seconds (~225 words)</option>
                        <option>2 minutes (~300 words)</option>
                        <option>3 minutes (~450 words)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                        Hook Style
                      </label>
                      <select
                        value={shortHookStyle}
                        onChange={(e) => setShortHookStyle(e.target.value)}
                        className="px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-300 text-sm shadow-inner cursor-pointer"
                      >
                        <option value="Bold Claim">Bold Claim (attention shocker)</option>
                        <option value="Shocking Stat">Shocking Stat (viral metric)</option>
                        <option value="Relatable Problem">Relatable Problem (pain point callout)</option>
                        <option value="Direct Question">Direct Question (cognitive push)</option>
                        <option value="Curiosity Gap">Curiosity Gap (incomplete story opener)</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                        Pacing Style
                      </label>
                      <select
                        value={shortPacingStyle}
                        onChange={(e) => setShortPacingStyle(e.target.value)}
                        className="px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-300 text-sm shadow-inner cursor-pointer"
                      >
                        <option value="Fast Cut (punchy, fragmented)">Fast Cut (fragmented, rapid-fire)</option>
                        <option value="Smooth Flow (conversational)">Smooth Flow (conversational balance)</option>
                        <option value="Narrative Arc">Narrative Arc (micro plot structure)</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                        CTA Style
                      </label>
                      <select
                        value={shortCtaStyle}
                        onChange={(e) => setShortCtaStyle(e.target.value)}
                        className="px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-300 text-sm shadow-inner cursor-pointer"
                      >
                        <option value="Follow for more">Follow for more</option>
                        <option value="Link in bio">Link in bio</option>
                        <option value="Comment below">Comment below</option>
                        <option value="Share this">Share this</option>
                        <option value="Save this">Save this</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 p-4 rounded-xl bg-zinc-950/40 border border-zinc-800/60">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={shortIncludeText}
                        onChange={(e) => setShortIncludeText(e.target.checked)}
                        className="w-4.5 h-4.5 rounded border-zinc-800 bg-zinc-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-zinc-200">Include On-Screen Text Suggestions</span>
                        <span className="text-[10px] text-zinc-500">Injects micro subtitle or graphics overlays [TEXT: "..."]</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Additional Context (Optional) */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                  Additional Context (Optional)
                </label>
                <textarea
                  value={mode === "long" ? longContext : shortContext}
                  onChange={(e) => mode === "long" ? setLongContext(e.target.value) : setShortContext(e.target.value)}
                  rows={3}
                  placeholder="Insert secondary reference details, keywords, must-include numbers, or stylistic requests here..."
                  className="px-4 py-3 bg-zinc-950/80 border border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-100 placeholder-zinc-600 transition text-sm shadow-inner resize-y"
                />
              </div>

              {/* Error Callout */}
              {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm flex items-center gap-2 animate-pulse">
                  ⚠️ {error}
                </div>
              )}

              {/* Success Callout */}
              {successMsg && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm flex items-center gap-2">
                  ✨ {successMsg}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-indigo-800/40 text-white font-extrabold rounded-xl transition-all shadow-lg hover:shadow-indigo-500/25 flex items-center justify-center gap-2.5 cursor-pointer disabled:cursor-not-allowed border border-indigo-400/20 text-base"
              >
                {loading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Authoring Script...</span>
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>Generate Viral Script</span>
                  </>
                )}
              </button>
            </form>

            {/* Premium Loader Status Step Overlay */}
            {loading && (
              <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md flex flex-col items-center justify-center gap-6 p-6 z-20 animate-fade-in">
                <div className="relative flex items-center justify-center">
                  <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                  <span className="absolute text-xl animate-pulse">⚡</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 text-center">
                  <h3 className="text-lg font-bold text-zinc-100 tracking-tight">AI Writer Active</h3>
                  <p className="text-indigo-400 text-sm font-mono tracking-wide animate-pulse">{statusMessage}</p>
                </div>
              </div>
            )}
          </div>

          {/* Generated Output Panel */}
          {(generatedScript || loading) && (
            <div id="studio-output" className="scroll-mt-24 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-2xl flex flex-col gap-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-80 h-80 bg-purple-600/5 rounded-full filter blur-[80px]" />
              
              <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
                <div className="flex flex-col gap-1">
                  <h2 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
                    📄 Generated {metadata?.type === "long" ? "Long-Form" : "Short-Form"} Script
                  </h2>
                  <p className="text-zinc-500 text-xs md:text-sm">
                    Review, copy, or save this high-retention composition to your personal library.
                  </p>
                </div>

                {metadata && (
                  <div className="flex items-center gap-2.5">
                    <div className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800/80 flex flex-col items-center justify-center min-w-[70px]">
                      <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Words</span>
                      <span className="text-xs font-mono font-bold text-indigo-400">{metadata.wordCount}</span>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800/80 flex flex-col items-center justify-center min-w-[80px]">
                      <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Duration</span>
                      <span className="text-xs font-mono font-bold text-indigo-400">{metadata.estimatedDuration}</span>
                    </div>
                    {metadata.sectionsMatch === false && (
                      <div className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 flex flex-col items-center justify-center" title="The generator output fewer sections than requested. Code validation active.">
                        <span className="text-[9px] uppercase font-bold text-rose-500 tracking-wider">Mismatch</span>
                        <span className="text-xs font-bold text-rose-400">⚠️ Flagged</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-4">
                  <div className="w-10 h-10 border-4 border-indigo-500/10 border-t-indigo-400 rounded-full animate-spin" />
                  <p className="text-zinc-500 text-xs font-mono">Formulating canvas data stream...</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Long-Form Rendering */}
                  {metadata?.type === "long" && generatedScript && (() => {
                    const parsed = parseLongForm(generatedScript);
                    return (
                      <div className="flex flex-col gap-4">
                        {parsed.firstNonSectionText && (
                          <div className="p-4 rounded-xl bg-zinc-950/40 border border-zinc-800/50 text-zinc-400 text-sm leading-relaxed mb-2 italic">
                            {parsed.firstNonSectionText}
                          </div>
                        )}
                        
                        <div className="flex flex-col gap-3">
                          {parsed.sections.map((sect, idx) => {
                            const isExpanded = expandedSections[idx];
                            return (
                              <div 
                                key={idx} 
                                className="bg-zinc-950/60 border border-zinc-800 rounded-xl overflow-hidden shadow-sm hover:border-zinc-700/60 transition-all duration-300"
                              >
                                {/* Accordion Header */}
                                <div 
                                  onClick={() => toggleSection(idx)}
                                  className="px-5 py-4 bg-zinc-900/60 flex items-center justify-between gap-4 cursor-pointer select-none group"
                                >
                                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                    <span className="w-6 h-6 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-[10px] font-mono text-zinc-400 select-none">
                                      {idx + 1}
                                    </span>
                                    <h3 className="text-sm md:text-base font-bold text-zinc-200 truncate group-hover:text-indigo-400 transition-colors">
                                      {sect.header}
                                    </h3>
                                    {sect.timestamp && (
                                      <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono text-[10px] font-bold">
                                        ⏱️ {sect.timestamp}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-zinc-500 group-hover:text-zinc-300 text-xs font-mono transition-transform duration-300 select-none">
                                      {isExpanded ? "Collapse ▲" : "Expand ▼"}
                                    </span>
                                  </div>
                                </div>

                                {/* Accordion Body */}
                                <div 
                                  className={`transition-all duration-300 ${
                                    isExpanded ? "max-h-[1000px] border-t border-zinc-900 p-5 opacity-100" : "max-h-0 overflow-hidden opacity-0"
                                  }`}
                                >
                                  {renderLongFormText(sect.body)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Short-Form Rendering */}
                  {metadata?.type === "short" && generatedScript && (() => {
                    const parsed = parseShortForm(generatedScript);
                    return (
                      <div className="flex flex-col gap-6">
                        
                        {/* Hook Zone */}
                        <div className="flex flex-col gap-2 relative bg-zinc-950/40 border border-zinc-800/60 rounded-xl p-5 shadow-sm">
                          <div className="absolute top-3 right-4 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-[10px] font-bold text-rose-400 uppercase tracking-widest select-none">
                            ⚡ Scroll-Stopping Hook
                          </div>
                          <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 select-none mb-1">
                            Opening Hook
                          </span>
                          <div className="mt-1">
                            {renderShortFormText(parsed.hook)}
                          </div>
                        </div>

                        {/* Body Zone */}
                        <div className="flex flex-col gap-2 relative bg-zinc-950/40 border border-zinc-800/60 rounded-xl p-5 shadow-sm">
                          <div className="absolute top-3 right-4 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400 uppercase tracking-widest select-none">
                            📖 Core Value
                          </div>
                          <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 select-none mb-1">
                            Script Body
                          </span>
                          <div className="mt-1">
                            {renderShortFormText(parsed.body)}
                          </div>
                        </div>

                        {/* CTA Zone */}
                        <div className="flex flex-col gap-2 relative bg-zinc-950/40 border border-zinc-800/60 rounded-xl p-5 shadow-sm">
                          <div className="absolute top-3 right-4 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase tracking-widest select-none">
                            🎯 Conversion Outro
                          </div>
                          <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 select-none mb-1">
                            Call to Action
                          </span>
                          <div className="mt-1">
                            {renderShortFormText(parsed.cta)}
                          </div>
                        </div>

                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Action Toolbar */}
              {!loading && generatedScript && (
                <div className="flex flex-wrap items-center gap-3 pt-5 border-t border-zinc-800 relative z-10">
                  <button
                    onClick={handleCopyClipboard}
                    className="flex-1 min-w-[150px] py-3 bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700/50 text-zinc-100 font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer text-sm shadow-sm"
                  >
                    <span>📋</span> Copy clean text
                  </button>
                  <button
                    onClick={handleSaveToLibrary}
                    className="flex-1 min-w-[150px] py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer text-sm shadow-md"
                  >
                    <span>💾</span> Save to Library
                  </button>
                  <button
                    onClick={() => handleGenerate()}
                    className="flex-1 min-w-[150px] py-3 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    <span>🔄</span> Regenerate
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Saved Scripts Vault */}
          <div className="flex flex-col gap-6">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
              📂 Saved Scripts Library
            </h2>

            {savedScripts.length === 0 ? (
              <div className="p-12 border border-dashed border-zinc-800 rounded-2xl text-center text-zinc-500 bg-zinc-900/10">
                No scripts saved to library yet. Complete a generation above and click "Save to Library"!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedScripts.map((script) => (
                  <div
                    key={script._id}
                    onClick={() => handleLoadSavedScript(script)}
                    className="bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700/60 rounded-xl p-5 cursor-pointer transition-all duration-300 flex flex-col gap-3.5 hover:-translate-y-0.5 shadow-md hover:shadow-lg relative overflow-hidden group"
                  >
                    {/* Glowing Accent */}
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-indigo-500 to-purple-500 opacity-60 group-hover:opacity-100 transition-opacity" />

                    <div className="flex items-start justify-between gap-3 pl-1.5">
                      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                        <h3 className="text-sm md:text-base font-bold text-zinc-100 truncate group-hover:text-indigo-400 transition-colors">
                          {script.topic}
                        </h3>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          Saved on {new Date(script.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        script.type === "long" 
                          ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" 
                          : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                      }`}>
                        {script.type === "long" ? "Long Form" : "Short Form"}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pl-1.5 text-[10px] md:text-xs">
                      <div className="flex flex-col gap-0.5 bg-zinc-950/40 p-2 rounded-lg border border-zinc-900">
                        <span className="text-zinc-600 font-bold uppercase tracking-wider text-[8px]">Tone</span>
                        <span className="text-zinc-300 font-semibold truncate">{script.tone}</span>
                      </div>
                      <div className="flex flex-col gap-0.5 bg-zinc-950/40 p-2 rounded-lg border border-zinc-900">
                        <span className="text-zinc-600 font-bold uppercase tracking-wider text-[8px]">
                          {script.type === "long" ? "Target" : "Platform"}
                        </span>
                        <span className="text-zinc-300 font-semibold truncate">
                          {script.type === "long" ? script.targetDuration : script.platform}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 bg-zinc-950/40 p-2 rounded-lg border border-zinc-900">
                        <span className="text-zinc-600 font-bold uppercase tracking-wider text-[8px]">Duration</span>
                        <span className="text-zinc-300 font-semibold truncate font-mono">{script.estimatedDuration}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] pl-1.5 pt-2 border-t border-zinc-900 text-zinc-500">
                      <span className="font-medium">Word Count: <strong className="font-mono text-zinc-400 font-bold">{script.wordCount} words</strong></span>
                      <span className="text-indigo-400 font-bold tracking-wide uppercase opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                        Inspect & Load ➔
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
