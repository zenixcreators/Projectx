// ============================================================
// caption.js — POST /caption route
// Drop this file in project/routes/caption.js
// Then in server.js add:
//   const captionRoute = require('./routes/caption');
//   app.use(captionRoute);
// ============================================================

const express = require("express");
const { YoutubeTranscript } = require("youtube-transcript");
const axios = require("axios");
const multer = require("multer");
const FormData = require("form-data");
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const MODELS = [
  "llama-3.3-70b-versatile",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "llama-3.1-8b-instant"
];

// Language names for prompting
const LANG_NAMES = {
  en: "English", hi: "Hindi", es: "Spanish", fr: "French", ar: "Arabic",
  pt: "Portuguese", de: "German", zh: "Chinese (Simplified)", ja: "Japanese",
  ko: "Korean", it: "Italian", ru: "Russian", tr: "Turkish", nl: "Dutch",
  pl: "Polish", sv: "Swedish", id: "Indonesian", ms: "Malay", th: "Thai",
  vi: "Vietnamese", bn: "Bengali", ta: "Tamil", te: "Telugu", mr: "Marathi",
  ur: "Urdu", fa: "Persian", uk: "Ukrainian", ro: "Romanian", cs: "Czech",
  el: "Greek", hu: "Hungarian", fi: "Finnish"
};

// ── HELPERS ──────────────────────────────────────────────────

async function groqChat(messages) {
  let lastErr;
  for (const model of MODELS) {
    try {
      const res = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        { model, messages, temperature: 0.3, max_tokens: 4000 },
        { headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" } }
      );
      return res.data.choices[0].message.content;
    } catch (e) {
      lastErr = e.response?.data?.error?.message || e.message;
      continue;
    }
  }
  throw new Error("All models failed: " + lastErr);
}

async function transcribeAudio(buffer, mimetype, filename) {
  const form = new FormData();
  form.append("file", buffer, { filename: filename || "audio.mp3", contentType: mimetype });
  form.append("model", "whisper-large-v3");
  form.append("response_format", "verbose_json");

  const res = await axios.post(
    "https://api.groq.com/openai/v1/audio/transcriptions",
    form,
    { headers: { ...form.getHeaders(), Authorization: `Bearer ${GROQ_API_KEY}` }, maxBodyLength: Infinity }
  );
  return res.data;
}

async function fetchYouTubeTranscript(url) {
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (!match) throw new Error("Invalid YouTube URL");
  const videoId = match[1];

  const items = await YoutubeTranscript.fetchTranscript(videoId);
  if (!items || items.length === 0) throw new Error("No transcript found. The video may not have captions.");

  // Build segments with real timestamps
  const segments = items.map(item => ({
    start: item.offset / 1000,
    end: (item.offset + item.duration) / 1000,
    text: item.text.replace(/\n/g, " ").trim()
  }));

  const text = segments.map(s => s.text).join(" ");
  return { text, segments };
}

// ── CAPTION GENERATOR ────────────────────────────────────────

function buildTimestamps(text, segments) {
  // If we have Whisper segments, use them; otherwise auto-generate
  if (segments && segments.length > 0) {
    return segments.map(s => ({
      start: s.start,
      end: s.end,
      text: s.text.trim()
    }));
  }

  // Auto-generate rough timestamps for plain text
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  let time = 0;
  return sentences.map(s => {
    const words = s.trim().split(" ").length;
    const duration = Math.max(1.5, words * 0.4);
    const seg = { start: time, end: time + duration, text: s.trim() };
    time += duration + 0.3;
    return seg;
  });
}

function toSRT(segments) {
  return segments.map((s, i) => {
    const fmt = t => {
      const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = Math.floor(t % 60), ms = Math.round((t % 1) * 1000);
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
    };
    return `${i + 1}\n${fmt(s.start)} --> ${fmt(s.end)}\n${s.text}`;
  }).join("\n\n");
}

function toVTT(segments) {
  const lines = ["WEBVTT", ""];
  segments.forEach((s, i) => {
    const fmt = t => {
      const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = Math.floor(t % 60), ms = Math.round((t % 1) * 1000);
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
    };
    lines.push(`${i + 1}`);
    lines.push(`${fmt(s.start)} --> ${fmt(s.end)}`);
    lines.push(s.text);
    lines.push("");
  });
  return lines.join("\n");
}

async function translateSegments(segments, targetLang) {
  const langName = LANG_NAMES[targetLang] || targetLang;
  if (targetLang === "en") return segments;

  const BATCH_SIZE = 12; // smaller batches for non-latin scripts // translate 20 segments at a time to avoid context overflow
  const result = [...segments];

  for (let i = 0; i < segments.length; i += BATCH_SIZE) {
    const batch = segments.slice(i, i + BATCH_SIZE);
    const sourceText = batch.map((s, j) => `[${i + j}] ${s.text}`).join("\n");

    const prompt = `Translate EVERY line below into ${langName}. 
Keep the [number] prefix on each line exactly as given.
Return ONLY the translated lines with their numbers. No explanation. No English.

${sourceText}`;

    try {
      const response = await groqChat([
        {
          role: "system", content: `You are a professional translator. Your ONLY job is to translate into ${langName}.
RULES:
- Translate EVERY line — no exceptions
- If the source is Telugu, Hindi, English or any other language — always output in ${langName}
- Never keep any word in the source language
- Never skip a line
- Output format: [number] translated text — nothing else` },
        { role: "user", content: prompt }
      ]);

      const lines = response.trim().split("\n").filter(l => l.match(/^\[\d+\]/));
      batch.forEach((s, j) => {
        const idx = i + j;
        const line = lines.find(l => l.startsWith(`[${idx}]`));
        if (line) result[idx] = { ...s, text: line.replace(/^\[\d+\]\s*/, "").trim() };
      });
    } catch (e) {
      console.error(`Batch ${i} translation failed:`, e.message);
    }
  }

  return result;
}

// ── MAIN ROUTE ───────────────────────────────────────────────

router.post("/caption", upload.single("file"), async (req, res) => {
  try {
    let type, rawText, whisperSegments = [];
    const parseSafe = (val, fallback) => {
      if (!val) return fallback;
      try { return JSON.parse(val); } catch (_) {
        return val.split(',').map(s => s.trim()).filter(Boolean);
      }
    };
    const langs = parseSafe(req.body?.langs || req.query?.langs, ['en']);
    const formats = parseSafe(req.body?.formats || req.query?.formats, ['srt', 'txt', 'vtt']);

    // 1. Get source text/segments
    if (req.file) {
      type = req.body.type || "audio";
      console.log(`Transcribing ${type} file: ${req.file.originalname}`);
      const whisperResult = await transcribeAudio(req.file.buffer, req.file.mimetype, req.file.originalname);
      rawText = whisperResult.text;
      whisperSegments = whisperResult.segments || [];

    } else {
      type = req.body.type;
      if (type === "url") {
        const ytData = await fetchYouTubeTranscript(req.body.value);
        rawText = ytData.text;
        whisperSegments = ytData.segments || [];
      } else {
        rawText = req.body.value;
      }
    }

    if (!rawText || !rawText.trim()) {
      return res.json({ error: "No text to process." });
    }

    // 2. Build base English segments
    const baseSegments = buildTimestamps(rawText.trim(), whisperSegments);

    // 3. Translate for each language and build output formats
    const captions = {};

    await Promise.all(langs.map(async (lang) => {
      try {
        const segments = await translateSegments(baseSegments, lang);
        captions[lang] = {};
        if (formats.includes("srt")) captions[lang].srt = toSRT(segments);
        if (formats.includes("vtt")) captions[lang].vtt = toVTT(segments);
        if (formats.includes("txt")) captions[lang].txt = segments.map(s => s.text).join("\n");
      } catch (e) {
        console.error(`Translation failed for ${lang}:`, e.message);
        captions[lang] = { srt: "Translation failed.", vtt: "Translation failed.", txt: "Translation failed." };
      }
    }));

    return res.json({ captions, wordCount: rawText.split(" ").length, segmentCount: baseSegments.length });

  } catch (err) {
    console.error("Caption error:", err.message);
    return res.json({ error: err.message });
  }
});

module.exports = router;
