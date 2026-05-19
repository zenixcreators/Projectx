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

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const uploadSingle = upload.single("file");

// Wrapper middleware to intercept Multer size limit errors cleanly
function handleMulterUpload(req, res, next) {
  uploadSingle(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: "File exceeds the 25MB limit. Please upload a smaller audio or video file." });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(500).json({ error: "Failed to process upload: " + err.message });
    }
    next();
  });
}

const GROQ_API_KEY = process.env.GROQ_API_KEY;

const MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "mixtral-8x7b-32768"
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

function toASS(segments) {
  const fmt = t => {
    const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = Math.floor(t % 60), ms = Math.round((t % 1) * 100);
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(ms).padStart(2, "0")}`;
  };

  const lines = [
    "[Script Info]",
    "Title: Aurora AI Generated Captions",
    "ScriptType: v4.00+",
    "Collisions: Normal",
    "PlayResX: 384",
    "PlayResY: 288",
    "Timer: 100.0000",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    "Style: Default,Arial,16,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1",
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"
  ];

  segments.forEach((s) => {
    lines.push(`Dialogue: 0,${fmt(s.start)},${fmt(s.end)},Default,,0,0,0,,${s.text}`);
  });

  return lines.join("\n");
}

async function translateSegments(segments, targetLang) {
  const langName = LANG_NAMES[targetLang] || targetLang;
  if (targetLang === "en") return segments;

  const result = [...segments];

  // Check if this is a language where natural/colloquial blending of English works best (like Telugu, Hindi, Tamil, etc.)
  const isSouthAsianColloquial = ["te", "ta", "hi", "mr", "bn", "ur"].includes(targetLang);
  const toneInstruction = isSouthAsianColloquial 
    ? `- Write in a highly natural, colloquial, modern conversational style as spoken by content creators and YouTubers.
- IMPORTANT: Naturally blend common English words (like 'video', 'YouTube', 'phone', 'computer', 'internet', 'subscribe', 'business', 'money', 'habits', 'success', 'comment', 'views', etc.) in the native script or in English if normally spoken that way in daily chat, rather than translating them to archaic, overly formal, literal dictionary terms (e.g. do NOT translate 'video' to highly Sanskritized/formal terms, keep it as 'వీడియో' or 'video').`
    : `- Write in a highly natural, conversational, modern and human-friendly creator tone suitable for video subtitles. Avoid overly stiff or formal dictionary translations.`;

  // 1. Attempt single-batch translation (context-preserving, robust & lightning fast!)
  try {
    console.log(`Translating all ${segments.length} segments to ${langName} in a single batch...`);
    const sourceText = segments.map((s, idx) => `[${idx}] ${s.text}`).join("\n");
    const prompt = `Translate EVERY line below into ${langName}. 
Keep the [number] prefix on each line exactly as given.
Return ONLY the translated lines with their numbers. No explanation. No English.

${sourceText}`;

    const response = await groqChat([
      {
        role: "system", content: `You are a professional, creator-friendly translator. Your ONLY job is to translate into ${langName}.
RULES:
- Translate EVERY line — no exceptions
- Keep the exact format: [number] translated text
- Never skip a line or add explanations
${toneInstruction}` },
      { role: "user", content: prompt }
    ]);

    const lines = response.trim().split("\n").filter(l => l.match(/^\[\d+\]/));
    let successCount = 0;
    segments.forEach((s, idx) => {
      const line = lines.find(l => l.startsWith(`[${idx}]`));
      if (line) {
        result[idx] = { ...s, text: line.replace(/^\[\d+\]\s*/, "").trim() };
        successCount++;
      }
    });

    if (successCount > 0) {
      console.log(`Single-batch translation successful: translated ${successCount}/${segments.length} segments.`);
      return result;
    }
    console.warn("Single-batch returned no valid formatted lines. Falling back to chunked translation...");
  } catch (err) {
    console.warn(`Single-batch translation failed: ${err.message}. Falling back to chunked translation...`);
  }

  // 2. Fallback: Sequential Chunked Translation
  const BATCH_SIZE = 15;
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
          role: "system", content: `You are a professional, creator-friendly translator. Your ONLY job is to translate into ${langName}.
RULES:
- Translate EVERY line — no exceptions
- Keep the exact format: [number] translated text
- Never skip a line or add explanations
${toneInstruction}` },
        { role: "user", content: prompt }
      ]);

      const lines = response.trim().split("\n").filter(l => l.match(/^\[\d+\]/));
      batch.forEach((s, j) => {
        const idx = i + j;
        const line = lines.find(l => l.startsWith(`[${idx}]`));
        if (line) result[idx] = { ...s, text: line.replace(/^\[\d+\]\s*/, "").trim() };
      });
    } catch (e) {
      console.error(`Batch starting at ${i} translation failed:`, e.message);
    }
  }

  return result;
}

// ── MAIN ROUTE ───────────────────────────────────────────────

router.post("/caption", handleMulterUpload, async (req, res) => {
  const parseSafe = (val, fallback) => {
    if (!val) return fallback;
    try { return JSON.parse(val); } catch (_) {
      return val.split(',').map(s => s.trim()).filter(Boolean);
    }
  };

  // ── INPUT VALIDATION BLOCK ──
  const validTypes = ["audio", "video", "url", "text"];
  let type = req.body?.type || (req.file ? "audio" : null);

  if (!type || !validTypes.includes(type)) {
    return res.status(400).json({ error: "Invalid or missing 'type' parameter. Must be 'audio', 'video', 'url', or 'text'." });
  }

  if (!req.file && (type === "url" || type === "text")) {
    const value = req.body?.value;
    if (!value || typeof value !== "string" || !value.trim()) {
      return res.status(400).json({ error: `Missing or invalid 'value' parameter for content type '${type}'.` });
    }
    if (type === "url" && !value.includes("youtube.com") && !value.includes("youtu.be")) {
      return res.status(400).json({ error: "Invalid YouTube URL format." });
    }
  }

  const langs = parseSafe(req.body?.langs || req.query?.langs, ['en']);
  const formats = parseSafe(req.body?.formats || req.query?.formats, ['srt', 'txt', 'vtt']);

  if (!Array.isArray(langs) || langs.length === 0) {
    return res.status(400).json({ error: "Langs parameter must be a non-empty array or comma-separated string." });
  }
  if (!Array.isArray(formats) || formats.length === 0) {
    return res.status(400).json({ error: "Formats parameter must be a non-empty array or comma-separated string." });
  }

  try {
    let rawText, whisperSegments = [];
    console.log(`Processing caption request: type=${type}`);

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
        if (formats.includes("ass")) captions[lang].ass = toASS(segments);
        if (formats.includes("txt")) captions[lang].txt = segments.map(s => s.text).join("\n");
      } catch (e) {
        console.error(`Translation failed for ${lang}:`, e.message);
        captions[lang] = { srt: "Translation failed.", vtt: "Translation failed.", ass: "Translation failed.", txt: "Translation failed." };
      }
    }));

    return res.json({ captions, wordCount: rawText.split(" ").length, segmentCount: baseSegments.length });

  } catch (err) {
    console.error("Caption error:", err.message);
    return res.json({ error: err.message });
  }
});

module.exports = router;
