const express = require("express");
const router = express.Router();
const axios = require("axios");

const GROQ_API_KEY = process.env.GROQ_API_KEY;

function clampHookScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function normalizeHookTest(data) {
  return {
    score: clampHookScore(data.score),
    grade: String(data.grade || "Needs Work").slice(0, 32),
    verdict: String(data.verdict || "").slice(0, 220),
    strengths: Array.isArray(data.strengths) ? data.strengths.slice(0, 3).map(String) : [],
    weaknesses: Array.isArray(data.weaknesses) ? data.weaknesses.slice(0, 3).map(String) : [],
    better_versions: Array.isArray(data.better_versions) ? data.better_versions.slice(0, 3).map(String) : [],
  };
}

/**
 * POST /analyze
 * Generates a viral script and exactly 5 hooks using Groq's Llama 3 model
 */
router.post("/analyze", async (req, res) => {
  const { input, tone } = req.body;
  
  if (!input) {
    return res.status(400).json({ error: "Input topic is required" });
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
    return res.status(500).json({ error: "Server configuration error" });
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

    const content = response.data.choices[0].message.content;
    res.json(normalizeHookTest(JSON.parse(content)));
  } catch (error) {
    console.error("Hook Tester Error:", error.response?.data || error.message);
    res.status(500).json({
      error: "Failed to test hook",
      details: error.response?.data?.error?.message || error.message
    });
  }
});

module.exports = router;
