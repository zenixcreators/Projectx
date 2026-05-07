require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const getPrompt = require("./prompts/contentPrompt");
const parseResponse = require("./utils/parser");
const captionRoute = require("./routes/caption");

const app = express();

app.use(cors());
app.use(express.json());

// ── IMPORTANT: routes BEFORE express.static ──
// If static comes first, Express serves index.html for unknown routes
// and the frontend gets HTML instead of JSON → "Unexpected token '<'" error
app.use(captionRoute);

app.use(express.static("public"));

const GROQ_API_KEY = process.env.GROQ_API_KEY;

const MODELS = [
  "llama-3.3-70b-versatile",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "llama-3.1-70b-versatile",
  "llama-3.1-8b-instant"
];

const SYSTEM_MSG = `You are a JSON API. Output only raw valid JSON. No markdown. No explanation. Start with { end with }.

CRITICAL RULE: The "full_script" field MUST contain these exact labeled sections in this exact order:
[HOOK] the hook line.

[PROBLEM] what went wrong. more detail.

[SHIFT] the realization moment.

[VALUE] the one thing that changed.

[RESULT] what happened after.

[ENDING] the final reframe line.

Each label must appear in square brackets exactly as shown above. This is required. No plain paragraphs.`;

app.post("/analyze", async (req, res) => {
  const { input, tone } = req.body;
  console.log("INPUT:", input, "TONE:", tone);

  const prompt = getPrompt(input, tone || "Conversational");
  let lastError;

  for (const model of MODELS) {
    try {
      console.log(`Trying model: ${model}`);

      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model,
          messages: [
            { role: "system", content: SYSTEM_MSG },
            { role: "user", content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 2000
        },
        {
          headers: {
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );

      const text = response.data.choices[0].message.content;
      console.log("======= RAW =======\n", text, "\n===================");

      const script = parseResponse(text);
      console.log("KEYS:", Object.keys(script));
      console.log("full_script:", (script.full_script || "MISSING").slice(0, 120));

      const hooks = [];
      if (script.hook) hooks.push({ text: script.hook, style: script.hook_type || "" });
      (script.alt_hooks || []).forEach(h => hooks.push({ text: typeof h === "string" ? h : h.text || "", style: "" }));

      return res.json({
        hooks,
        scripts: [script],
        ideas: script.hashtags || [],
        model_used: model
      });

    } catch (err) {
      const errMsg = err.response?.data?.error?.message || err.message;
      console.warn(`Model ${model} failed: ${errMsg}`);
      lastError = errMsg;
    }
  }

  console.error("All models failed:", lastError);
  res.json({
    hooks: [],
    scripts: [{ hook: "All models failed.", full_script: "", alt_hooks: [] }],
    ideas: [],
    error: lastError
  });
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));