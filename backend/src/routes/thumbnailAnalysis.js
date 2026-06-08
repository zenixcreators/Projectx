const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Fallback prompt template in case analyzer.txt is not accessible
const FALLBACK_SYSTEM_PROMPT = `You are an expert YouTube thumbnail analyst and image generation prompt engineer.

When a user uploads a thumbnail image, you will:
1. ANALYZE the thumbnail across 6 dimensions
2. GENERATE a reconstruction prompt in both plain text and JSON
3. OUTPUT a platform-specific image generation prompt

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — VISUAL ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPOSITION
- Layout pattern (subject-left, centered, split, text-dominant)
- Framing (close-up, mid-shot, wide)
- Rule of thirds usage
- Element hierarchy (what the eye hits first, second, third)

COLOR PALETTE
- Dominant background color (provide hex code)
- Accent colors (provide hex codes)
- Text color
- Overall color temperature (warm / cool / neutral)
- Contrast level (low / medium / high / extreme)

SUBJECT
- Who or what is the subject
- Facial expression (if person present)
- Body language and gesture
- Position in frame
- Clothing style if visible

TYPOGRAPHY
- Text content visible on thumbnail
- Text position (top-left / top-right / center / bottom etc.)
- Font style (bold / outlined / shadow / clean)
- Text size relative to frame (small / medium / large / dominant)
- Any tilt or rotation

LIGHTING
- Light source direction
- Lighting style (cinematic / studio / natural / dramatic / flat)
- Shadow presence and intensity
- Depth of field (sharp / shallow blur)

MOOD AND PSYCHOLOGICAL TRIGGER
Identify the PRIMARY psychological trigger from this list:
- curiosity_gap — withheld information, partial reveal
- fomo — fear of missing out, urgency
- authority — trust signals, expertise markers
- transformation — before/after, change implied
- shock — extreme reaction, unbelievable claim
- relatability — "this is you", casual and human
- aspiration — lifestyle, success, wealth imagery
- educational — value-first, numbered steps, tutorial

Then score the emotional register:
- urgency: 1–10
- trust: 1–10
- excitement: 1–10

Identify the viewer action intent:
What emotion is the creator trying to trigger to make someone click?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — PROMPT GENERATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Using your analysis, generate a reconstruction prompt in TWO formats:

FORMAT A — PLAIN TEXT
Write a single paragraph prompt (3–5 sentences) that describes the thumbnail in enough detail to recreate it. Follow this order:
Scene → Subject → Colors → Text overlay → Lighting → Mood → Platform modifiers
Rules:
- Use hex codes for colors, not color names
- Use positional language (center-left, top-right, 30% of frame)
- Include emotion vocabulary (curiosity gap energy, urgency, hype)
- End with platform modifiers appropriate to the selected tool

FORMAT B — JSON
Return a structured object with these exact keys:
{
  "platform": "[selected platform]",
  "scene": {
    "background": "[hex or description]",
    "framing": "[aspect ratio and style]",
    "depth": "[depth of field description]"
  },
  "subject": {
    "description": "[who/what]",
    "expression": "[facial expression]",
    "position": "[frame position]",
    "gesture": "[body language]"
  },
  "colors": {
    "dominant": "[hex]",
    "accent": "[hex]",
    "text_color": "[hex]"
  },
  "text_overlay": {
    "content": "[text visible or placeholder]",
    "position": "[frame position]",
    "style": "[font style description]",
    "size": "[relative size]"
  },
  "lighting": "[lighting description]",
  "mood": "[mood keywords]",
  "psychological_trigger": "[trigger from list above]",
  "emotional_register": {
    "urgency": [1-10],
    "trust": [1-10],
    "excitement": [1-10]
  },
  "viewer_action_intent": "[what emotion drives the click]",
  "platform_modifiers": "[platform-specific suffix]"
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3 — PLATFORM IMAGE GEN PROMPT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generate a final ready-to-paste prompt tuned for the selected platform.
- Midjourney: Write a dense descriptive prompt ending with --ar 16:9 --q 2 --style raw --v 6.1
- DALL-E 3: Write in natural language sentences. Be explicit about layout and positioning.
- Ideogram: Keep it concise. Ideogram handles typography well — include any text overlays directly in the prompt with quotes. Add "typographic thumbnail style" at the end.
- Flux: Write a balanced prompt, moderately descriptive. Include lighting and mood keywords.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADJACENT PROMPTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
After the main prompt, generate 3 style variation prompts (one sentence each):
- Variation 1 — Color shift
- Variation 2 — Minimal version
- Variation 3 — High energy version

Always return a single valid JSON object with this structure:
{
  "analysis": {
    "composition": {
      "layout_pattern": "Layout pattern from: subject-left, centered, split, text-dominant",
      "framing": "Framing style: close-up, mid-shot, wide",
      "rule_of_thirds": "Rule of thirds usage description (e.g., subject on right third, text on left)",
      "element_hierarchy": "Comma-separated visual hierarchy order, e.g. text overlay, person, background"
    },
    "color_palette": {
      "dominant_bg": "Hex code of dominant background color",
      "accents": ["List of hex codes for accent colors"],
      "text_color": "Hex code of text overlay color",
      "temp": "Overall color temperature: warm, cool, or neutral",
      "contrast": "Contrast level: low, medium, high, or extreme"
    },
    "subject": {
      "description": "Short description of the subject (who/what)",
      "expression": "Facial expression of person, or 'none' if no person",
      "body_language": "Body language/gesture details, or 'none' if no person",
      "position": "Position in frame",
      "clothing": "Clothing style description, or 'none' if no person"
    },
    "typography": {
      "text_visible": "Text content visible on the thumbnail, or 'none'",
      "position": "Text position on the frame (e.g. top-left, center)",
      "font_style": "Font style description: bold, outlined, shadow, clean, etc.",
      "size": "Text size: small, medium, large, or dominant",
      "tilt": "Tilt/rotation description if present, or 'none'"
    },
    "lighting": {
      "direction": "Light source direction",
      "style": "Lighting style: cinematic, studio, natural, dramatic, or flat",
      "shadows": "Shadow presence and intensity",
      "depth_of_field": "Depth of field: sharp focus or shallow blur"
    },
    "mood_and_trigger": {
      "primary_trigger": "Primary trigger from: curiosity_gap, fomo, authority, transformation, shock, relatability, aspiration, educational",
      "viewer_action_intent": "What emotion triggers the viewer to click",
      "emotional_register": {
        "urgency": 1-10,
        "trust": 1-10,
        "excitement": 1-10
      }
    }
  },
  "prompt_plain": "Reconstruction prompt in plain text (paragraph format)",
  "prompt_json": {
    "platform": "Midjourney, DALL-E 3, Flux, or Ideogram",
    "scene": {
      "background": "Background description",
      "framing": "Framing style",
      "depth": "Depth description"
    },
    "subject": {
      "description": "Subject description",
      "expression": "Expression description",
      "position": "Position description",
      "gesture": "Gesture description"
    },
    "colors": {
      "dominant": "Hex",
      "accent": "Hex",
      "text_color": "Hex"
    },
    "text_overlay": {
      "content": "Text visible",
      "position": "Position",
      "style": "Style",
      "size": "Size"
    },
    "lighting": "Lighting description",
    "mood": "Mood description",
    "psychological_trigger": "Trigger from list",
    "emotional_register": {
      "urgency": 1-10,
      "trust": 1-10,
      "excitement": 1-10
    },
    "viewer_action_intent": "Viewer intent",
    "platform_modifiers": "Modifiers"
  },
  "generation_prompt": "Platform-specific copyable prompt",
  "adjacent_variants": [
    { "label": "Color shift", "prompt": "One sentence variant prompt" },
    { "label": "Minimal", "prompt": "One sentence variant prompt" },
    { "label": "High energy", "prompt": "One sentence variant prompt" }
  ]
}

Return JSON only. No preamble. No markdown. No explanation outside the JSON.`;

router.post('/api/analyze-thumbnail', upload.single('thumbnailImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No thumbnail image file uploaded.' });
    }

    if (!GROQ_API_KEY) {
      return res.status(500).json({ success: false, error: 'Groq API Key is not configured on the server.' });
    }

    // 1. Read prompt instructions from analyzer.txt if available, otherwise use fallback
    let systemPrompt = FALLBACK_SYSTEM_PROMPT;
    try {
      const analyzerFile = path.join(__dirname, '../../../analyzer.txt');
      if (fs.existsSync(analyzerFile)) {
        systemPrompt = fs.readFileSync(analyzerFile, 'utf8');
      }
    } catch (err) {
      console.warn('[ThumbnailAnalysis] Error reading analyzer.txt, using fallback prompt:', err.message);
    }

    // 2. Convert uploaded buffer to base64
    const base64Image = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype || 'image/jpeg';

    console.log(`[ThumbnailAnalysis] Running vision audit using llama-4-scout-17b-16e-instruct...`);

    // 3. Make API request to Groq Vision endpoint
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this YouTube thumbnail image and return a valid JSON object matching the required structure."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 45000 // 45 seconds timeout for vision models
      }
    );

    const rawContent = response.data.choices[0].message.content.trim();
    
    // Parse response content to verify it's valid JSON
    let parsedJson;
    try {
      parsedJson = JSON.parse(rawContent);
    } catch (parseErr) {
      console.error('[ThumbnailAnalysis] Failed to parse JSON from AI model:', rawContent);
      return res.status(500).json({ 
        success: false, 
        error: 'The Vision model did not return a valid JSON response. Please try again.',
        rawResult: rawContent 
      });
    }

    return res.status(200).json({ success: true, data: parsedJson });

  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.response?.data?.error || error.message || String(error);
    console.error('[ThumbnailAnalysis] Error during vision audit:', errMsg);
    return res.status(500).json({ success: false, error: errMsg });
  }
});

// New endpoint to extract YouTube thumbnail from URL and run Vision audit
router.post('/api/analyze-thumbnail-url', async (req, res) => {
  try {
    const { videoUrl } = req.body;
    if (!videoUrl) {
      return res.status(400).json({ success: false, error: 'videoUrl parameter is required.' });
    }

    const match = videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (!match) {
      return res.status(400).json({ success: false, error: 'Invalid YouTube URL format.' });
    }
    const videoId = match[1];

    // Get the high-res thumbnail URL
    const imageUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    
    let imageResponse;
    try {
      // Download maxresdefault thumbnail image
      imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 10000 });
    } catch (err) {
      // Fallback to hqdefault if maxresdefault doesn't exist (e.g. standard resolution videos)
      const fallbackUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      console.log(`[ThumbnailAnalysis] Maxresdefault thumbnail not found. Trying fallback: ${fallbackUrl}`);
      try {
        imageResponse = await axios.get(fallbackUrl, { responseType: 'arraybuffer', timeout: 10000 });
      } catch (innerErr) {
        return res.status(400).json({ success: false, error: 'Failed to retrieve YouTube thumbnail image from URL.' });
      }
    }

    const base64Image = Buffer.from(imageResponse.data).toString('base64');
    const mimeType = imageResponse.headers['content-type'] || 'image/jpeg';

    if (!GROQ_API_KEY) {
      return res.status(500).json({ success: false, error: 'Groq API Key is not configured on the server.' });
    }

    let systemPrompt = FALLBACK_SYSTEM_PROMPT;
    try {
      const analyzerFile = path.join(__dirname, '../../../analyzer.txt');
      if (fs.existsSync(analyzerFile)) {
        systemPrompt = fs.readFileSync(analyzerFile, 'utf8');
      }
    } catch (err) {
      console.warn('[ThumbnailAnalysis] Error reading analyzer.txt, using fallback prompt:', err.message);
    }

    console.log(`[ThumbnailAnalysis] Running URL vision audit using llama-4-scout-17b-16e-instruct...`);

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this YouTube thumbnail image and return a valid JSON object matching the required structure."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 45000
      }
    );

    const rawContent = response.data.choices[0].message.content.trim();
    let parsedJson = JSON.parse(rawContent);

    // Also send back the extracted thumbnail URL for front-end preview display
    return res.status(200).json({ 
      success: true, 
      data: parsedJson, 
      extractedThumbnailUrl: `data:${mimeType};base64,${base64Image}` 
    });

  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.response?.data?.error || error.message || String(error);
    console.error('[ThumbnailAnalysis] Error during vision URL audit:', errMsg);
    return res.status(500).json({ success: false, error: errMsg });
  }
});

module.exports = router;
