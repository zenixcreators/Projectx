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
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
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

function parseYoutubeTranscriptAi(responseText) {
  let duration = 0;
  const durationMatch = responseText.match(/Duration:\s*(?:(\d+):)?(\d+):(\d+)/i);
  if (durationMatch) {
    const hours = parseInt(durationMatch[1] || "0", 10);
    const minutes = parseInt(durationMatch[2], 10);
    const seconds = parseInt(durationMatch[3], 10);
    duration = hours * 3600 + minutes * 60 + seconds;
  }

  const lines = responseText.split("\n");
  const transcriptStartIndex = lines.findIndex(line => line.trim().startsWith("## Transcript"));
  const transcriptLines = transcriptStartIndex !== -1 ? lines.slice(transcriptStartIndex + 1) : lines;

  const segments = [];
  const timestampRegex = /^\[(?:(\d+):)?(\d+):(\d+)\]\s*(.*)$/;

  for (const line of transcriptLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(timestampRegex);
    if (match) {
      const hours = parseInt(match[1] || "0", 10);
      const minutes = parseInt(match[2], 10);
      const seconds = parseInt(match[3], 10);
      const start = hours * 3600 + minutes * 60 + seconds;
      const text = match[4].trim();

      segments.push({
        start,
        end: 0,
        text
      });
    }
  }

  for (let i = 0; i < segments.length; i++) {
    if (i < segments.length - 1) {
      segments[i].end = segments[i + 1].start;
    } else {
      segments[i].end = duration > 0 ? duration : segments[i].start + 30;
    }
  }

  const text = segments.map(s => s.text).join(" ");
  return { text, segments };
}

async function fetchYouTubeTranscript(url) {
  const match = url.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([a-zA-Z0-9_-]{11})/);
  if (!match) throw new Error("Invalid YouTube URL");
  const videoId = match[1];

  let lastError;

  // ── METHOD 1: YouTube Timedtext XML API (most reliable, no package needed) ──
  try {
    console.log(`[YouTube Transcript] Attempting timedtext API for: ${videoId}`);
    const result = await fetchViaTimedtextAPI(videoId);
    if (result && result.segments && result.segments.length > 0) {
      console.log(`[YouTube Transcript] Timedtext API succeeded: ${result.segments.length} segments`);
      return result;
    }
  } catch (err) {
    console.warn(`[YouTube Transcript] Timedtext API failed: ${err.message}`);
    lastError = err;
  }

  // ── METHOD 2: youtubei.js InnerTube API (very reliable, emulates YouTube client) ──
  try {
    console.log(`[YouTube Transcript] Attempting youtubei.js InnerTube for: ${videoId}`);
    const result = await fetchViaYoutubeiJS(videoId);
    if (result && result.segments && result.segments.length > 0) {
      console.log(`[YouTube Transcript] youtubei.js succeeded: ${result.segments.length} segments`);
      return result;
    }
  } catch (err) {
    console.warn(`[YouTube Transcript] youtubei.js failed: ${err.message}`);
    lastError = err;
  }

  // ── METHOD 3: youtube-transcript npm package + proxy fallbacks ──
  try {
    console.log(`[YouTube Transcript] Attempting youtube-transcript npm for: ${videoId}`);
    let items;
    try {
      items = await YoutubeTranscript.fetchTranscript(videoId);
    } catch (directErr) {
      console.warn(`[YouTube Transcript] Direct fetch failed: ${directErr.message}. Trying proxies...`);
      lastError = directErr;
      // Try public proxies
      const proxies = [
        (t) => `https://api.allorigins.win/raw?url=${encodeURIComponent(t)}`,
        (t) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(t)}`,
      ];
      if (process.env.TRANSCRIPT_PROXY_PREFIX) {
        proxies.unshift((t) => `${process.env.TRANSCRIPT_PROXY_PREFIX}${encodeURIComponent(t)}`);
      }
      for (let i = 0; i < proxies.length; i++) {
        const getProxyUrl = proxies[i];
        try {
          const proxyFetch = async (targetUrl, options = {}) => {
            if ((options.method || 'GET').toUpperCase() === 'GET') {
              return fetch(getProxyUrl(targetUrl), options);
            }
            return fetch(targetUrl, options);
          };
          items = await YoutubeTranscript.fetchTranscript(videoId, { fetch: proxyFetch });
          if (items && items.length > 0) {
            console.log(`[YouTube Transcript] Proxy ${i + 1} succeeded!`);
            break;
          }
        } catch (proxyErr) {
          console.warn(`[YouTube Transcript] Proxy ${i + 1} failed: ${proxyErr.message}`);
          lastError = proxyErr;
        }
      }
    }

    if (items && items.length > 0) {
      const isMs = items.some(item => item.offset > 5000 || item.duration > 1000);
      const scale = isMs ? 1000 : 1;
      const segments = items.map(item => ({
        start: item.offset / scale,
        end: (item.offset + item.duration) / scale,
        text: item.text.replace(/\n/g, " ").trim()
      }));
      return { text: segments.map(s => s.text).join(" "), segments };
    }
  } catch (err) {
    console.warn(`[YouTube Transcript] youtube-transcript npm failed: ${err.message}`);
    lastError = err;
  }

  // ── METHOD 4: youtube-transcript.ai fallback ──
  try {
    console.log(`[YouTube Transcript] Attempting youtube-transcript.ai for: ${videoId}`);
    const fallbackRes = await axios.get(`https://youtube-transcript.ai/transcript/${videoId}.txt`, { timeout: 10000 });
    if (fallbackRes.data && typeof fallbackRes.data === 'string' && fallbackRes.data.includes('## Transcript')) {
      const parsed = parseYoutubeTranscriptAi(fallbackRes.data);
      if (parsed.segments && parsed.segments.length > 0) {
        console.log(`[YouTube Transcript] youtube-transcript.ai succeeded: ${parsed.segments.length} segments.`);
        return parsed;
      }
    }
  } catch (err) {
    console.warn(`[YouTube Transcript] youtube-transcript.ai failed: ${err.message}`);
    lastError = err;
  }

  throw new Error(
    `Could not retrieve captions for this video. This usually happens because: ` +
    `(1) The video has captions disabled, ` +
    `(2) The video is private or age-restricted, ` +
    `(3) YouTube is temporarily blocking automated requests. ` +
    `Try a different video or paste the transcript manually using the "Text" tab.`
  );
}

// ── Timedtext API: fetches YouTube caption XML directly ──────────────────────
async function fetchViaTimedtextAPI(videoId) {
  // First, fetch the video page to get the caption track list from ytInitialPlayerResponse
  const pageRes = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, {
    timeout: 12000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    }
  });

  const html = pageRes.data;

  // Extract ytInitialPlayerResponse JSON from the page
  const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});\s*(?:var\s|window\[|<\/script>)/s);
  if (!playerResponseMatch) {
    throw new Error("Could not extract player data from YouTube page");
  }

  let playerResponse;
  try {
    playerResponse = JSON.parse(playerResponseMatch[1]);
  } catch (e) {
    throw new Error("Failed to parse YouTube player response JSON");
  }

  // Get captions from player response
  const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!captionTracks || captionTracks.length === 0) {
    throw new Error("No caption tracks found for this video");
  }

  // Prefer English, fall back to first available
  const engTrack = captionTracks.find(t => t.languageCode === 'en' || t.languageCode === 'en-US' || t.languageCode === 'en-GB');
  const track = engTrack || captionTracks[0];

  if (!track.baseUrl) throw new Error("Caption track has no baseUrl");

  // Fetch the caption XML (fmt=json3 gives JSON format)
  const captionUrl = track.baseUrl + '&fmt=json3';
  const captionRes = await axios.get(captionUrl, { timeout: 10000 });
  const data = captionRes.data;

  if (!data || !data.events) throw new Error("Invalid caption data format");

  const segments = data.events
    .filter(ev => ev.segs && ev.segs.length > 0)
    .map(ev => {
      const text = ev.segs.map(s => s.utf8 || '').join('').replace(/\n/g, ' ').trim();
      const start = (ev.tStartMs || 0) / 1000;
      const end = start + (ev.dDurationMs || 3000) / 1000;
      return { start, end, text };
    })
    .filter(s => s.text.length > 0);

  if (segments.length === 0) throw new Error("No caption segments extracted");

  return { text: segments.map(s => s.text).join(' '), segments };
}

// ── youtubei.js: uses YouTube InnerTube API (ESM, loaded via dynamic import) ─
async function fetchViaYoutubeiJS(videoId) {
  // Use dynamic import since youtubei.js is an ESM module
  const { Innertube } = await import('youtubei.js');
  const youtube = await Innertube.create({ retrieve_player: false });
  const info = await youtube.getInfo(videoId);
  const transcriptData = await info.getTranscript();

  const body = transcriptData?.transcript?.content?.body;
  if (!body) throw new Error("No transcript body returned by youtubei.js");

  const rawSegments = body.initial_segments || [];
  if (rawSegments.length === 0) throw new Error("Empty transcript from youtubei.js");

  const segments = rawSegments.map(seg => ({
    start: (seg.start_ms || 0) / 1000,
    end: ((seg.start_ms || 0) + (seg.end_ms ? seg.end_ms - seg.start_ms : 3000)) / 1000,
    text: (seg.snippet?.text || '').replace(/\n/g, ' ').trim()
  })).filter(s => s.text.length > 0);

  return { text: segments.map(s => s.text).join(' '), segments };
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

function isEnglishText(text) {
  // Check if it's mostly ASCII/Latin characters
  const clean = text.toLowerCase().replace(/[^a-z\s]/g, "");
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;
  
  // Common English stop words
  const englishStopWords = new Set([
    "the", "and", "of", "to", "is", "you", "that", "it", "he", "was",
    "for", "on", "are", "as", "with", "his", "they", "i", "at", "be",
    "this", "have", "from", "or", "one", "had", "by", "word", "but",
    "not", "what", "all", "were", "we", "when", "your", "can", "said",
    "there", "use", "an", "each", "which", "she", "do", "how", "their",
    "if", "will", "up", "other", "about", "out", "many", "then", "them",
    "these", "so", "some", "her", "would", "make", "like", "him", "into",
    "has", "look", "two", "more", "write", "go", "see", "number", "no",
    "way", "could", "people", "my", "than", "first", "water", "been",
    "call", "who", "oil", "its", "now", "find"
  ]);
  
  let matchCount = 0;
  for (const word of words) {
    if (englishStopWords.has(word)) {
      matchCount++;
    }
  }
  
  // If more than 8% of words are common English words (or at least 2 words if text is short), we classify it as English.
  const ratio = matchCount / words.length;
  return ratio > 0.08 || (words.length < 10 && matchCount >= 1);
}

async function translateSegments(segments, targetLang) {
  const langName = LANG_NAMES[targetLang] || targetLang;
  if (targetLang === "en") {
    const sampleText = segments.map(s => s.text).join(" ");
    if (isEnglishText(sampleText)) {
      console.log("Detected English input text. Skipping English translation.");
      return segments;
    }
    console.log("Detected non-English input text. Proceeding with English translation...");
  }

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
Return ONLY the translated lines with their numbers. No explanation.${targetLang === 'en' ? '' : ' No English.'}

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
Return ONLY the translated lines with their numbers. No explanation.${targetLang === 'en' ? '' : ' No English.'}

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
  const validTypes = ["audio", "video", "url", "text", "transcript"];
  let type = req.body?.type || (req.file ? "audio" : null);

  if (!type || !validTypes.includes(type)) {
    return res.status(400).json({ error: "Invalid or missing 'type' parameter. Must be 'audio', 'video', 'url', 'text', or 'transcript'." });
  }

  if (!req.file && (type === "url" || type === "text" || type === "transcript")) {
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
