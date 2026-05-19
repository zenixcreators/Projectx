const express = require("express");
const router = express.Router();
const axios = require("axios");
const parseResponse = require("../utils/parser");

const GROQ_API_KEY = process.env.GROQ_API_KEY;

function clampHookScore(value) {
  const match = String(value ?? "").match(/-?\d+(?:\.\d+)?/);
  const score = match ? Number(match[0]) : Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function normalizeHookTest(data) {
  const source = data.result || data.analysis || data.hook_test || data;
  const score = clampHookScore(source.score ?? source.viral_score ?? source.virality_score);
  const fallbackMetrics = {
    curiosity: score,
    clarity: Math.max(0, Math.min(100, score + 4)),
    specificity: Math.max(0, Math.min(100, score - 6)),
    spoken: Math.max(0, Math.min(100, score + 2))
  };

  return {
    score,
    grade: String(source.grade || gradeHookScore(score)).slice(0, 32),
    verdict: String(source.verdict || source.reason || verdictForScore(score)).slice(0, 220),
    metrics: normalizeMetrics(source.metrics, fallbackMetrics),
    strengths: normalizeList(source.strengths || source.pros || source.what_works, 3),
    weaknesses: normalizeList(source.weaknesses || source.cons || source.fixes || source.improvements, 3),
    better_versions: normalizeList(source.better_versions || source.rewrites || source.alternatives, 3),
  };
}

function normalizeList(value, limit) {
  if (Array.isArray(value)) return value.slice(0, limit).map(item => String(item).trim()).filter(Boolean);
  if (typeof value === "string" && value.trim()) {
    return value.split(/\n|;/).map(item => item.replace(/^[-*\d.)\s]+/, "").trim()).filter(Boolean).slice(0, limit);
  }
  return [];
}

function normalizeMetrics(value, fallback = {}) {
  const source = value && typeof value === "object" ? value : {};
  return Object.entries(fallback).reduce((metrics, [key, fallbackValue]) => {
    metrics[key] = clampHookScore(source[key] ?? fallbackValue);
    return metrics;
  }, {});
}

function gradeHookScore(score) {
  if (score >= 85) return "Strong";
  if (score >= 70) return "Promising";
  if (score >= 55) return "Needs Work";
  return "Weak";
}

function verdictForScore(score) {
  if (score >= 85) return "This hook has clear tension and should earn attention quickly.";
  if (score >= 70) return "This hook is usable, but it needs sharper specificity or curiosity.";
  if (score >= 55) return "This hook has a clear idea, but it sounds too general to hold retention.";
  return "This hook needs a stronger promise, clearer stakes, and more spoken tension.";
}

function buildFallbackHookTest(hook, topic) {
  const text = String(hook || "").trim();
  const words = text.split(/\s+/).filter(Boolean);
  let score = 45;

  if (words.length >= 4 && words.length <= 14) score += 14;
  if (/[?]/.test(text)) score += 8;
  if (/\b(stop|never|why|mistake|secret|truth|before|after|most people|nobody|without)\b/i.test(text)) score += 14;
  if (/\b(you|your|I|my)\b/i.test(text)) score += 8;
  if (/\d/.test(text)) score += 6;
  if (topic && text.toLowerCase().includes(String(topic).toLowerCase().split(/\s+/)[0])) score += 4;
  if (words.length > 18) score -= 12;
  if (/^(how to|tips for|ways to)\b/i.test(text)) score -= 8;

  score = clampHookScore(score);

  return {
    score,
    grade: gradeHookScore(score),
    verdict: verdictForScore(score),
    metrics: {
      curiosity: clampHookScore(score + (/[?]|\bwhy|secret|truth|mistake\b/i.test(text) ? 6 : -4)),
      clarity: clampHookScore(score + (words.length <= 14 ? 8 : -10)),
      specificity: clampHookScore(score + (/\d/.test(text) ? 8 : -6)),
      spoken: clampHookScore(score + (/\b(you|your|I|my)\b/i.test(text) ? 6 : -2))
    },
    strengths: [
      words.length <= 14 ? "Short enough to be understood quickly." : "The idea is understandable.",
      /\b(you|your|I|my)\b/i.test(text) ? "It feels directed at a real viewer." : "It can work once the viewer target is clearer."
    ],
    weaknesses: [
      "Add a more specific consequence or contrast.",
      "Make the wording sound more like something said out loud."
    ],
    better_versions: [
      `Most people get ${topic || "this"} wrong in the first 3 seconds.`,
      `Stop doing ${topic || "this"} the way everyone teaches it.`,
      `The real reason ${topic || "this"} is not working is simpler than you think.`
    ]
  };
}

function cleanTopic(topic) {
  return String(topic || "this idea").replace(/[^\w\s-]/g, "").replace(/\s+/g, " ").trim().slice(0, 80) || "this idea";
}

function buildFallbackHooks(topic) {
  const subject = cleanTopic(topic);
  const hooks = [
    `Most people get ${subject} wrong in the first 3 seconds.`,
    `Stop doing ${subject} the way everyone teaches it.`,
    `The uncomfortable truth about ${subject} is simple.`,
    `I changed one thing in ${subject} and everything moved.`,
    `Nobody tells you this part of ${subject}.`
  ];

  return {
    hooks,
    bestHook: hooks[0],
    angle: "behavior gap",
    reason: "The best hook creates a clear mistake pattern and immediate curiosity."
  };
}

function normalizeGeneratedHooks(data, topic) {
  const source = data.result || data.hook_set || data;
  let hooks = source.hooks || source.alt_hooks || source.variations || [];

  if (!Array.isArray(hooks)) hooks = [];

  hooks = hooks
    .map(item => typeof item === "string" ? item : (item.text || item.hook || ""))
    .map(item => String(item).trim())
    .filter(Boolean)
    .slice(0, 5);

  const fallback = buildFallbackHooks(topic);
  hooks = hooks.map((hook, index) => isWeakGeneratedHook(hook) ? fallback.hooks[index] : hook);
  if (hooks.filter(hook => fallback.hooks.includes(hook)).length >= 3) {
    hooks = fallback.hooks.slice();
  }
  while (hooks.length < 5) hooks.push(fallback.hooks[hooks.length]);

  let bestHook = String(source.bestHook || source.best_hook || hooks[0] || fallback.bestHook).trim();
  if (isWeakGeneratedHook(bestHook) || !hooks.includes(bestHook)) bestHook = hooks[0] || fallback.bestHook;

  return {
    hooks,
    bestHook,
    angle: String(source.angle || fallback.angle).slice(0, 80),
    reason: String(source.reason || source.verdict || fallback.reason).slice(0, 220)
  };
}

function isWeakGeneratedHook(hook) {
  const text = String(hook || "").trim();
  if (wordCount(text) < 4) return true;
  return /\b(one trick|one simple trick|viral videos start here|await|boring intros|rank higher|boost views|grow with just|unlock your|0 to hero|zero to hero|create viral content|get noticed|wish i knew|newbie|massive growth|daily habit|ultimate guide|tips for|how to)\b/i.test(text);
}

function wordCount(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean).length;
}

function estimateDuration(words) {
  return `${Math.max(5, Math.round(words / 2.35))}s`;
}

function gradeScriptScore(score) {
  if (score >= 86) return "High Retention";
  if (score >= 72) return "Solid";
  if (score >= 58) return "Needs Tightening";
  return "Weak";
}

function verdictForScriptScore(score) {
  if (score >= 86) return "The script has a strong opening, clean movement, and enough tension to keep viewers watching.";
  if (score >= 72) return "The script works, but one or two sections need sharper tension or a clearer payoff.";
  if (score >= 58) return "The script has a usable base, but the hook, pacing, or ending needs more pressure.";
  return "The script needs a clearer opening, more visible stakes, and a stronger reason to keep watching.";
}

function buildFallbackScriptTest(script, topic) {
  const text = String(script || "").trim();
  const words = wordCount(text);
  const lines = text.split(/\n+/).map(line => line.trim()).filter(Boolean);
  const firstLine = (lines[0] || text.split(".")[0] || "").replace(/^\[[^\]]+\]\s*/i, "").trim();
  const firstWords = wordCount(firstLine);
  const sectionNames = ["hook", "problem", "shift", "value", "result", "ending", "cta"];
  const sectionHits = sectionNames.filter(name => new RegExp(`\\[?${name}\\]?`, "i").test(text)).length;
  const concreteHits = (text.match(/\b(upload|draft|edit|phone|screen|clicked|opened|posted|watched|saved|comment|message|workout|notebook|call|email|tab)\b/gi) || []).length;
  const tensionHits = (text.match(/\b(but|until|wrong|stopped|never|failed|hidden|mistake|truth|problem|instead)\b/gi) || []).length;
  const ctaHits = (text.match(/\b(comment|save|follow|send|try|watch|download|share|reply|click)\b/gi) || []).length;

  const hook = clampHookScore(42 + (firstWords >= 4 && firstWords <= 14 ? 22 : 0) + (/\b(stop|why|truth|wrong|never|nobody|most people)\b/i.test(firstLine) ? 16 : 0) + (/[?]/.test(firstLine) ? 6 : 0));
  const structure = clampHookScore(38 + sectionHits * 8 + (words >= 70 && words <= 150 ? 14 : 0));
  const retention = clampHookScore(44 + Math.min(tensionHits * 5, 25) + Math.min(lines.length * 3, 15) + (words > 150 ? -10 : 0));
  const clarity = clampHookScore(48 + (words >= 70 && words <= 130 ? 18 : 0) + Math.min(concreteHits * 4, 20) - (words > 180 ? 14 : 0));
  const payoff = clampHookScore(42 + (/\b(result|ending|cta)\b/i.test(text) ? 14 : 0) + Math.min(ctaHits * 8, 18) + (/\b(the .* was never|wasn't .* it was|that was the point)\b/i.test(text) ? 10 : 0));
  const score = clampHookScore((hook * 0.24) + (retention * 0.26) + (clarity * 0.2) + (structure * 0.16) + (payoff * 0.14));

  const strengths = [
    firstWords >= 4 && firstWords <= 14 ? "The opening is short enough for a viewer to process quickly." : "The script has a clear starting idea.",
    tensionHits > 2 ? "There are enough tension words to create movement." : "The script has room to build stronger tension.",
    concreteHits > 2 ? "It uses visible actions instead of only abstract claims." : "The main idea can become stronger with more physical detail."
  ];

  const weaknesses = [
    hook < 70 ? "The first line needs a sharper contradiction or consequence." : "The hook is doing its job, but the next line must keep pressure.",
    retention < 70 ? "The middle needs more turns, evidence, or visible behavior." : "Pacing is decent, but avoid smoothing out the story too much.",
    payoff < 70 ? "The ending needs a clearer payoff or call to action." : "The payoff is present; make sure it does not sound too polished."
  ];

  return {
    score,
    grade: gradeScriptScore(score),
    verdict: verdictForScriptScore(score),
    metrics: { hook, retention, clarity, structure, payoff },
    strengths,
    weaknesses,
    fixes: [
      `Open with the visible mistake inside ${cleanTopic(topic)}.`,
      "Add one concrete object, number, or repeated behavior in the middle.",
      "End with a consequence, not a summary."
    ],
    word_count: words,
    estimated_duration: estimateDuration(words)
  };
}

function normalizeScriptTest(data, fallback) {
  const source = data.result || data.analysis || data.script_test || data;
  const score = clampHookScore(source.score ?? source.viral_score ?? source.retention_score ?? fallback.score);
  const metricFallback = fallback.metrics || {};

  return {
    score,
    grade: String(source.grade || gradeScriptScore(score)).slice(0, 32),
    verdict: String(source.verdict || source.reason || verdictForScriptScore(score)).slice(0, 260),
    metrics: normalizeMetrics(source.metrics, metricFallback),
    strengths: normalizeList(source.strengths || source.what_works || source.pros, 3),
    weaknesses: normalizeList(source.weaknesses || source.risks || source.cons, 3),
    fixes: normalizeList(source.fixes || source.next_steps || source.improvements, 3),
    word_count: Number(source.word_count || fallback.word_count) || fallback.word_count,
    estimated_duration: String(source.estimated_duration || fallback.estimated_duration)
  };
}

/**
 * POST /analyze
 * Generates a viral script and exactly 5 hooks using Groq's Llama 3 model
 */
router.post("/analyze", async (req, res) => {
  // ── INPUT VALIDATION BLOCK ──
  const { input, tone } = req.body || {};
  
  if (!input || typeof input !== "string" || !input.trim()) {
    return res.status(400).json({ error: "Missing or invalid 'input' topic. Must be a non-empty string." });
  }

  if (tone && typeof tone !== "string") {
    return res.status(400).json({ error: "Invalid 'tone' parameter. Must be a string." });
  }

  if (!GROQ_API_KEY) {
    console.error("GROQ_API_KEY is missing in environment variables");
    return res.status(500).json({ error: "Server configuration error" });
  }

  try {
    const prompt = `You are an expert viral content creator. 
    Generate a high-retention video script based on this topic: "${input}". 
    Target Tone: ${tone || "Energetic"}.
    
    CRITICAL INSTRUCTIONS FOR HOOKS:
    1. Generate exactly 5 distinct, high-engagement hooks.
    2. Choose the absolute best hook from these 5 to use in the "sections" part of the script.
    3. The "hooks" array must contain all 5 hooks.
    
    Return ONLY a valid JSON object with this exact structure:
    {
      "scripts": [
        {
          "sections": {
            "hook": "[Insert the BEST hook from the list of 5 here]",
            "problem": "...",
            "shift": "...",
            "value": "...",
            "result": "...",
            "ending": "..."
          },
          "hooks": [
            "Hook 1 (The Best One)",
            "Hook 2",
            "Hook 3",
            "Hook 4",
            "Hook 5"
          ],
          "virality_score": 9.8,
          "virality_reason": "Explain why the chosen hook is the best",
          "wordCount": 115,
          "duration": "55s",
          "hashtags": ["#viral", "#growth"]
        }
      ]
    }`;

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are a specialized AI that only outputs valid JSON. You always provide exactly 5 hooks." },
          { role: "user", content: prompt }
        ],
        temperature: 0.8,
        response_format: { type: "json_object" }
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 25000
      }
    );

    const content = response.data.choices[0].message.content;
    let data = JSON.parse(content);

    res.json(data);
  } catch (error) {
    console.error("Generation Route Error:", error.response?.data || error.message);
    res.status(500).json({ 
      error: "Failed to generate script", 
      details: error.response?.data?.error?.message || error.message 
    });
  }
});

/**
 * POST /api/generate-hooks
 * Generates a focused set of hooks without the full script canvas.
 */
router.post("/api/generate-hooks", async (req, res) => {
  const { topic, tone } = req.body;

  if (!topic || !topic.trim()) {
    return res.status(400).json({ error: "Topic is required" });
  }

  if (!GROQ_API_KEY) {
    console.error("GROQ_API_KEY is missing in environment variables");
    return res.json(buildFallbackHooks(topic));
  }

  try {
    const prompt = `Generate five short-form video hooks for this topic.

Topic: "${topic}"
Tone: ${tone || "Energetic"}

Rules:
- exactly 5 hooks
- spoken, not written
- each hook under 14 words
- each hook uses a different angle
- avoid generic titles and broad advice

Return ONLY valid JSON:
{
  "hooks": ["hook 1", "hook 2", "hook 3", "hook 4", "hook 5"],
  "bestHook": "best hook from the list",
  "angle": "main winning angle",
  "reason": "one sentence explaining why the best hook wins"
}`;

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are a hook generation API. Return only valid JSON." },
          { role: "user", content: prompt }
        ],
        temperature: 0.85,
        response_format: { type: "json_object" }
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 25000
      }
    );

    const content = response.data.choices?.[0]?.message?.content || "";
    const parsed = parseResponse(content);

    if (!parsed || parsed.hook === "Failed to parse AI output") {
      console.warn("Hook Generator Parse Fallback:", content.slice(0, 500));
      return res.json(buildFallbackHooks(topic));
    }

    res.json(normalizeGeneratedHooks(parsed, topic));
  } catch (error) {
    console.error("Hook Generator Error:", error.response?.data || error.message);
    res.json(buildFallbackHooks(topic));
  }
});

/**
 * POST /api/test-hook
 * Scores a single video hook and suggests stronger alternatives.
 */
router.post("/api/test-hook", async (req, res) => {
  const { hook, topic, tone } = req.body;

  if (!hook || !hook.trim()) {
    return res.status(400).json({ error: "Hook text is required" });
  }

  if (!GROQ_API_KEY) {
    console.error("GROQ_API_KEY is missing in environment variables");
    return res.json(buildFallbackHookTest(hook, topic));
  }

  try {
    const prompt = `Evaluate this short-form video opening hook.

Hook: "${hook}"
Topic/context: "${topic || "Not provided"}"
Tone: ${tone || "Not specified"}

Score it like a strict retention strategist. A strong hook must sound spoken, create immediate curiosity or tension, be clear at first listen, and avoid sounding like a generic title.

Return ONLY valid JSON with this exact structure:
{
  "score": 82,
  "grade": "Strong",
  "verdict": "One sentence explaining the score.",
  "metrics": {
    "curiosity": 84,
    "clarity": 78,
    "specificity": 72,
    "spoken": 86
  },
  "strengths": ["specific strength", "specific strength"],
  "weaknesses": ["specific weakness"],
  "better_versions": ["rewritten hook 1", "rewritten hook 2", "rewritten hook 3"]
}`;

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are a hook testing API. Return only valid JSON and be strict, concise, and practical." },
          { role: "user", content: prompt }
        ],
        temperature: 0.45,
        response_format: { type: "json_object" }
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 25000
      }
    );

    const content = response.data.choices?.[0]?.message?.content || "";
    const parsed = parseResponse(content);

    if (!parsed || parsed.hook === "Failed to parse AI output") {
      console.warn("Hook Tester Parse Fallback:", content.slice(0, 500));
      return res.json(buildFallbackHookTest(hook, topic));
    }

    const normalized = normalizeHookTest(parsed);
    if (!normalized.score) {
      const fallback = buildFallbackHookTest(hook, topic);
      normalized.score = fallback.score;
      normalized.grade = normalized.grade || fallback.grade;
      normalized.verdict = normalized.verdict || fallback.verdict;
      normalized.metrics = fallback.metrics;
    }

    res.json(normalized);
  } catch (error) {
    console.error("Hook Tester Error:", error.response?.data || error.message);
    res.json(buildFallbackHookTest(hook, topic));
  }
});

/**
 * POST /api/test-script
 * Scores a complete short-form script for retention, clarity, and payoff.
 */
router.post("/api/test-script", async (req, res) => {
  const { script, topic, tone } = req.body;

  if (!script || !script.trim()) {
    return res.status(400).json({ error: "Script text is required" });
  }

  const fallback = buildFallbackScriptTest(script, topic);

  if (!GROQ_API_KEY) {
    console.error("GROQ_API_KEY is missing in environment variables");
    return res.json(fallback);
  }

  try {
    const prompt = `Evaluate this short-form video script like a strict retention strategist.

Topic/context: "${topic || "Not provided"}"
Tone: ${tone || "Not specified"}

Script:
${script}

Score the actual script. Do not invent a sample. Judge hook strength, retention movement, clarity, structure, and payoff.

Return ONLY valid JSON:
{
  "score": 78,
  "grade": "Solid",
  "verdict": "One practical sentence explaining the score.",
  "metrics": {
    "hook": 80,
    "retention": 74,
    "clarity": 82,
    "structure": 76,
    "payoff": 70
  },
  "strengths": ["specific strength", "specific strength"],
  "weaknesses": ["specific weakness", "specific weakness"],
  "fixes": ["specific fix", "specific fix", "specific fix"],
  "word_count": 104,
  "estimated_duration": "44s"
}`;

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are a script testing API. Return only valid JSON and score the supplied script only." },
          { role: "user", content: prompt }
        ],
        temperature: 0.35,
        response_format: { type: "json_object" }
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 25000
      }
    );

    const content = response.data.choices?.[0]?.message?.content || "";
    const parsed = parseResponse(content);

    if (!parsed || parsed.hook === "Failed to parse AI output") {
      console.warn("Script Tester Parse Fallback:", content.slice(0, 500));
      return res.json(fallback);
    }

    const normalized = normalizeScriptTest(parsed, fallback);
    if (!normalized.strengths.length) normalized.strengths = fallback.strengths;
    if (!normalized.weaknesses.length) normalized.weaknesses = fallback.weaknesses;
    if (!normalized.fixes.length) normalized.fixes = fallback.fixes;

    res.json(normalized);
  } catch (error) {
    console.error("Script Tester Error:", error.response?.data || error.message);
    res.json(fallback);
  }
});

module.exports = router;
