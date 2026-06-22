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

// SAFEGUARD WARNING: Ensure that in production environments, SMTP configurations (SMTP_HOST, SMTP_USER, SMTP_PASS)
// are strictly defined in environment variables. Local developer OTP console bypasses must never be deployed to production.

// Fallback prompt template in case analyzer.txt is not accessible
const FALLBACK_SYSTEM_PROMPT = `You are an expert YouTube thumbnail analyst and image generation prompt engineer.

When a user uploads a thumbnail image, you will:

1. ANALYZE the thumbnail across 6 dimensions
2. GENERATE a reconstruction prompt in both plain text and JSON
3. OUTPUT a platform-specific image generation prompt

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — VISUAL ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Extract the following from the image:

COMPOSITION
- Layout pattern (subject-left, centered, split, text-dominant)
- Framing (close-up, mid-shot, wide)
- Rule of thirds usage
- Element hierarchy (what the eye hits first, second, third)

COLOR PALETTE
- Dominant background color (provide hex code)
- Accent colors (provide hex codes)
- Text color (provide hex code)
- Overall color temperature (warm / cool / neutral)
  * CRITICAL: You must extract and identify the dominant background, accents, and text overlay colors FIRST, and then explicitly derive the overall color temperature from those specific hex values.
  * Warm: Dominant hex codes represent warm colors (reds, oranges, yellows, warm browns, etc.).
  * Cool: Dominant hex codes represent cool colors (blues, teals, purples, cool greens, etc.).
  * Neutral: Dominant hex codes represent neutral/monochrome/grayscale colors (blacks, whites, grays, desaturated colors, or perfectly balanced warm/cool colors). Do not overcorrect to warm or cool if the colors are neutral or grayscale.
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
- Identify the PRIMARY psychological trigger from this list:
  * curiosity_gap — withheld information, partial reveal
  * fomo — fear of missing out, urgency
  * authority — trust signals, expertise markers
  * transformation — before/after, change implied
  * shock — extreme reaction, unbelievable claim
  * relatability — "this is you", casual and human
  * aspiration — lifestyle, success, wealth imagery
  * educational — value-first, numbered steps, tutorial
- Then score the emotional register:
  * urgency: 1–10
  * trust: 1–10
  * excitement: 1–10
- Identify the viewer action intent:
  * What cognitive drive or specific action is the creator trying to trigger to make someone click?
  * CRITICAL: 'viewer_action_intent' and 'primary_trigger' MUST NEVER be the same string. They represent different visual-psychological dimensions. 'primary_trigger' is a high-level psychological layout framework, while 'viewer_action_intent' is the cognitive drive or action description (e.g. "click to resolve the hidden clue", "validate their own setup").

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PARTIAL FAILURE & AMBIGUOUS CONTENT STRATEGY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- If a thumbnail is valid but has ambiguous features, do not report an error. Use graceful fallbacks:
  * If there is no text overlay, set typography.text_visible to "none". Do not raise an error.
  * If the image is grayscale or monochromatic, set color_palette.temp to "neutral". Do not raise an error.
  * If there is no person present, set subject.description to a description of the primary objects (or "none"), and other subject fields to "none".
- ONLY set error.is_invalid to true and populate error.reason with a descriptive explanation if the file is completely unreadable, corrupted, blurred beyond recognition, or is clearly NOT a graphic design or thumbnail concept (e.g. random noise, completely blank canvas, non-design photo).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — PROMPT GENERATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Using your analysis, generate a reconstruction prompt in TWO formats:

FORMAT A — PLAIN TEXT
Write a single paragraph prompt (3–5 sentences) that describes the thumbnail
in enough detail to recreate it. Follow this order:
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

IF platform = Midjourney:
Write a dense descriptive prompt ending with --ar 16:9 --q 2 --style raw --v 6.1
Focus on visual quality keywords: ultra-sharp, cinematic, professional studio lighting

IF platform = DALL-E 3:
Write in natural language sentences. Be explicit about layout and positioning.
DALL-E responds to clear spatial instructions. No special suffix needed.

IF platform = Ideogram:
Keep it concise. Ideogram handles typography well — include any text overlays
directly in the prompt with quotes. Add "typographic thumbnail style" at the end.

IF platform = Flux:
Write a balanced prompt, moderately descriptive. Include lighting and mood keywords.
Flux handles photorealism well — lean into photographic language.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ASSET HANDLING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If user provides assets (logo, face photo, product image):
- Anchor those elements as fixed references in the prompt
- Use: "Use the provided [face/logo/product] as the [subject/brand element]"
- Keep all other visual decisions consistent with the analysis

If no assets provided:
- Infer subject archetype from the thumbnail style
- Use descriptive fallback: "young male creator, early 20s, [expression]"
- Never leave subject undefined — always provide a concrete description

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADJACENT PROMPTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

After the main prompt, generate 3 style variation prompts.
Each variation keeps the same layout and psychological trigger
but shifts one major variable:

Variation 1 — Color shift (different palette, same composition)
Variation 2 — Minimal version (strip back to type + subject only)
Variation 3 — High energy version (amplify contrast, saturation, urgency)

Label each clearly. Keep them short — one sentence each.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEW-SHOT EXAMPLES (MULTI-NICHE & CONTROL CASES)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXAMPLE 1: COOKING/FOOD NICHE (Warm temperature)
- Image description: Close up of a sizzling steak with a yellow circle highlighting the juices and white bold text "SECRET INGREDIENT".
- Output JSON:
{
  "error": {
    "is_invalid": false,
    "reason": null
  },
  "analysis": {
    "composition": {
      "layout_pattern": "centered",
      "framing": "close-up",
      "rule_of_thirds": "subject centered, yellow highlight circle on the right third",
      "element_hierarchy": "steak, yellow circle highlight, text overlay, background"
    },
    "color_palette": {
      "dominant_bg": "#3a221d",
      "accents": ["#ff5e00", "#ffd700"],
      "text_color": "#ffffff",
      "temp": "warm",
      "contrast": "high"
    },
    "subject": {
      "description": "sizzling beef ribeye steak on a cast-iron skillet",
      "expression": "none",
      "body_language": "none",
      "position": "center",
      "clothing": "none"
    },
    "typography": {
      "text_visible": "SECRET INGREDIENT",
      "position": "bottom-center",
      "font_style": "bold capitalized",
      "size": "large",
      "tilt": "none"
    },
    "lighting": {
      "direction": "top-down",
      "style": "dramatic",
      "shadows": "dark high contrast shadows around skillet",
      "depth_of_field": "shallow blur"
    },
    "mood_and_trigger": {
      "primary_trigger": "curiosity_gap",
      "viewer_action_intent": "discover the hidden cooking technique that elevates home steaks to restaurant quality",
      "emotional_register": {
        "urgency": 6,
        "trust": 8,
        "excitement": 9
      }
    }
  },
  "prompt_plain": "A close-up shot of a sizzling beef ribeye steak on a cast-iron skillet with a dark wood background (#3a221d). A glowing orange sizzle accent (#ff5e00) rises from the meat. A bright yellow circle highlight (#ffd700) outlines a juicy section. Bold white text overlay (#ffffff) reads 'SECRET INGREDIENT' at the bottom-center. Dramatic top-down studio lighting casts strong shadows with a shallow depth of field. High energy, mouth-watering curiosity gap.",
  "prompt_json": {
    "platform": "Midjourney",
    "scene": {
      "background": "#3a221d dark cast-iron skillet",
      "framing": "16:9 close-up macro photography",
      "depth": "shallow depth of field, blurred background"
    },
    "subject": {
      "description": "juicy glistening ribeye steak",
      "expression": "none",
      "position": "center of frame",
      "gesture": "none"
    },
    "colors": {
      "dominant": "#3a221d",
      "accent": "#ff5e00",
      "text_color": "#ffffff"
    },
    "text_overlay": {
      "content": "SECRET INGREDIENT",
      "position": "bottom-center",
      "style": "bold sans-serif, high-impact",
      "size": "large"
    },
    "lighting": "dramatic top-down lighting with steam and sizzling oil highlights",
    "mood": "sensory appeal, intense curiosity gap, culinary secret",
    "psychological_trigger": "curiosity_gap",
    "emotional_register": {
      "urgency": 6,
      "trust": 8,
      "excitement": 9
    },
    "viewer_action_intent": "discover the hidden cooking technique that elevates home steaks to restaurant quality",
    "platform_modifiers": "--ar 16:9 --q 2 --style raw --v 6.1"
  },
  "generation_prompt": "Close-up macro photography of a juicy ribeye steak sizzling on a cast-iron skillet, dark brown background (#3a221d), bright orange flames (#ff5e00) rising, yellow circular graphic (#ffd700) highlighting details, bold white typography text overlay '#SECRET INGREDIENT' at the bottom-center, dramatic studio lighting, cinematic, ultra-sharp --ar 16:9 --q 2 --style raw --v 6.1",
  "adjacent_variants": [
    { "label": "Color shift", "prompt": "Steak sizzling on skillet with vibrant blue fire accents (#00d2ff) and clean white text on a cool slate background (#1e293b)." },
    { "label": "Minimal", "prompt": "Minimalist close-up of a perfectly grilled steak on a black plate, with a tiny yellow circle highlight and no text." },
    { "label": "High energy", "prompt": "Amplified version with intense fire embers, extreme contrast, saturated red tones (#ef4444), and large yellow text 'MUST DO!'." }
  ]
}

EXAMPLE 2: FINANCE/INVESTING NICHE (Cool temperature)
- Image description: A line chart pointing down in red, with a shocked face of a creator on the right looking at it, and big red text "CRASH?".
- Output JSON:
{
  "error": {
    "is_invalid": false,
    "reason": null
  },
  "analysis": {
    "composition": {
      "layout_pattern": "split",
      "framing": "mid-shot",
      "rule_of_thirds": "creator on the right third, red falling chart on the left third",
      "element_hierarchy": "shocked creator face, red falling chart, text overlay, dark background"
    },
    "color_palette": {
      "dominant_bg": "#0f172a",
      "accents": ["#ef4444", "#3b82f6"],
      "text_color": "#ef4444",
      "temp": "cool",
      "contrast": "high"
    },
    "subject": {
      "description": "male creator with hands on cheeks",
      "expression": "shocked, wide eyes, open mouth",
      "body_language": "both hands framing face in distress",
      "position": "right-center",
      "clothing": "dark casual hoodie"
    },
    "typography": {
      "text_visible": "CRASH?",
      "position": "top-left",
      "font_style": "bold italic outlined",
      "size": "dominant",
      "tilt": "slight rotation counter-clockwise"
    },
    "lighting": {
      "direction": "front-right side keylight",
      "style": "studio",
      "shadows": "soft shadows on the left background",
      "depth_of_field": "sharp focus"
    },
    "mood_and_trigger": {
      "primary_trigger": "fomo",
      "viewer_action_intent": "anticipate market movement and protect their investment portfolio from imminent losses",
      "emotional_register": {
        "urgency": 9,
        "trust": 7,
        "excitement": 8
      }
    }
  },
  "prompt_plain": "A mid-shot of a male creator with a shocked expression (#0f172a background), hands on his cheeks, positioned on the right-center. On the left side is a glowing red stock chart line plunging downwards (#ef4444). Huge bold italicized red text (#ef4444) at the top-left reads 'CRASH?'. Cool blue neon accents (#3b82f6) edge the background. Studio keylighting highlights the creator, creating high contrast. High urgency finance fomo vibes.",
  "prompt_json": {
    "platform": "DALL-E 3",
    "scene": {
      "background": "dark slate blue room (#0f172a) with subtle tech grid lines",
      "framing": "16:9 mid-shot portrait",
      "depth": "sharp focus throughout"
    },
    "subject": {
      "description": "young male creator in his late 20s",
      "expression": "eyes wide and mouth open in panic",
      "position": "right-center of frame",
      "gesture": "holding his face in panic"
    },
    "colors": {
      "dominant": "#0f172a",
      "accent": "#ef4444",
      "text_color": "#ef4444"
    },
    "text_overlay": {
      "content": "CRASH?",
      "position": "top-left",
      "style": "heavy impact font, outlined in black",
      "size": "dominant"
    },
    "lighting": "studio keylight on the creator's face with cool ambient backlighting",
    "mood": "panic, market emergency, financial anxiety",
    "psychological_trigger": "fomo",
    "emotional_register": {
      "urgency": 9,
      "trust": 7,
      "excitement": 8
    },
    "viewer_action_intent": "anticipate market movement and protect their investment portfolio from imminent losses",
    "platform_modifiers": ""
  },
  "generation_prompt": "A YouTube thumbnail showing a young man on the right side of the frame looking shocked with wide eyes and open mouth, holding his hands on his face. On the left side of the frame, a red glowing stock market chart arrow pointing sharply down. The background is dark slate blue (#0f172a) with cool blue accent lighting (#3b82f6). At the top left, large bold red text 'CRASH?'. Professional studio lighting, realistic, high contrast.",
  "adjacent_variants": [
    { "label": "Color shift", "prompt": "Shocked creator on the right side against a bright yellow background (#eab308) with green chart line (#22c55e) and green text 'BOOM?'." },
    { "label": "Minimal", "prompt": "Minimalist red line chart pointing down against a black background with a tiny text 'RECOVERY' at the bottom." },
    { "label": "High energy", "prompt": "Extreme close-up of shocked eyes, red color wash, intense flames, and huge yellow text 'EXIT NOW!'." }
  ]
}

EXAMPLE 3: TRAVEL/VLOGGING NICHE (Warm temperature)
- Image description: Sunny blue sky beach landscape, with a creator smiling in the foreground. Text: "I QUIT MY JOB".
- Output JSON:
{
  "error": {
    "is_invalid": false,
    "reason": null
  },
  "analysis": {
    "composition": {
      "layout_pattern": "subject-left",
      "framing": "mid-shot",
      "rule_of_thirds": "creator smiling on the left third, tropical beach on the right",
      "element_hierarchy": "smiling creator, tropical beach background, text overlay"
    },
    "color_palette": {
      "dominant_bg": "#38bdf8",
      "accents": ["#fef08a", "#fb7185"],
      "text_color": "#ffffff",
      "temp": "warm",
      "contrast": "high"
    },
    "subject": {
      "description": "young female creator wearing a straw hat",
      "expression": "happy, smiling widely, relaxed",
      "body_language": "shoulders relaxed, facing slightly towards center",
      "position": "left-center",
      "clothing": "casual white linen shirt"
    },
    "typography": {
      "text_visible": "I QUIT MY JOB",
      "position": "right-center",
      "font_style": "bold sans-serif with shadow",
      "size": "large",
      "tilt": "none"
    },
    "lighting": {
      "direction": "natural sunlight from top-right",
      "style": "natural",
      "shadows": "soft shadows behind subject",
      "depth_of_field": "shallow blur on beach background"
    },
    "mood_and_trigger": {
      "primary_trigger": "aspiration",
      "viewer_action_intent": "escape daily grind and live vicariously through full-time travel freedom",
      "emotional_register": {
        "urgency": 4,
        "trust": 8,
        "excitement": 9
      }
    }
  },
  "prompt_plain": "A sunny tropical beach backdrop under a clear blue sky (#38bdf8). A happy smiling young female creator wearing a straw hat is on the left-center. Warm golden sands (#fef08a) and turquoise ocean stretch out. Large bold white text (#ffffff) with coral drop shadow (#fb7185) reads 'I QUIT MY JOB' on the right-center. Natural bright daylight illuminates the scene with a shallow depth of field. Aspirational adventure vibes.",
  "prompt_json": {
    "platform": "Flux",
    "scene": {
      "background": "tropical sunny beach with palm trees and blue sky (#38bdf8)",
      "framing": "16:9 horizontal landscape layout",
      "depth": "soft background bokeh blur"
    },
    "subject": {
      "description": "happy young female traveler",
      "expression": "joyful beaming smile",
      "position": "left third of frame",
      "gesture": "standing relaxed"
    },
    "colors": {
      "dominant": "#38bdf8",
      "accent": "#fef08a",
      "text_color": "#ffffff"
    },
    "text_overlay": {
      "content": "I QUIT MY JOB",
      "position": "right-center",
      "style": "clean modern bold font with pink coral shadow",
      "size": "large"
    },
    "lighting": "bright warm natural sunlight, golden hour glow",
    "mood": "inspirational, freedom, travel wanderlust, aspirational escape",
    "psychological_trigger": "aspiration",
    "emotional_register": {
      "urgency": 4,
      "trust": 8,
      "excitement": 9
    },
    "viewer_action_intent": "escape daily grind and live vicariously through full-time travel freedom",
    "platform_modifiers": ""
  },
  "generation_prompt": "A YouTube thumbnail showing a joyful young woman smiling widely on the left side of the frame, wearing a straw hat. The background is a beautiful sunny tropical beach with palm trees and a bright sky blue atmosphere (#38bdf8) and golden sand (#fef08a). On the right side, bold white text overlay reads 'I QUIT MY JOB'. High contrast, bright natural sunlight, photorealistic.",
  "adjacent_variants": [
    { "label": "Color shift", "prompt": "Sunset beach background with warm orange and purple sky gradient (#f97316), golden silhouette, and bright yellow text." },
    { "label": "Minimal", "prompt": "A close-up of a suitcase on the sand with a single airline tag reading 'FREEDOM' in white text." },
    { "label": "High energy", "prompt": "Action shot of creator jumping into the ocean, high saturation, splashing water, and vibrant text 'FREE!'." }
  ]
}

EXAMPLE 4: BLACK & WHITE CAMERA TUTORIAL (Neutral/Monochrome control case)
- Image description: Minimalist black and white photo of a vintage camera on a clean dark table, with clean white text: "PRO LIGHTING".
- Output JSON:
{
  "error": {
    "is_invalid": false,
    "reason": null
  },
  "analysis": {
    "composition": {
      "layout_pattern": "centered",
      "framing": "mid-shot",
      "rule_of_thirds": "camera centered on intersections, text overlay at the top",
      "element_hierarchy": "vintage camera, text overlay, dark background table"
    },
    "color_palette": {
      "dominant_bg": "#121212",
      "accents": ["#737373", "#e5e5e5"],
      "text_color": "#ffffff",
      "temp": "neutral",
      "contrast": "high"
    },
    "subject": {
      "description": "vintage mechanical film camera",
      "expression": "none",
      "body_language": "none",
      "position": "center",
      "clothing": "none"
    },
    "typography": {
      "text_visible": "PRO LIGHTING",
      "position": "top-center",
      "font_style": "clean modern sans-serif",
      "size": "medium",
      "tilt": "none"
    },
    "lighting": {
      "direction": "left-side soft light",
      "style": "studio",
      "shadows": "soft grayscale shadows extending to the right",
      "depth_of_field": "sharp focus"
    },
    "mood_and_trigger": {
      "primary_trigger": "educational",
      "viewer_action_intent": "master professional studio lighting setups using simple monochrome equipment",
      "emotional_register": {
        "urgency": 3,
        "trust": 9,
        "excitement": 5
      }
    }
  },
  "prompt_plain": "A minimalist black and white photograph of a vintage film camera resting on a dark slate table (#121212). The camera has silver-metallic highlights (#e5e5e5) and matte gray textures (#737373). Clean white sans-serif text overlay (#ffffff) reads 'PRO LIGHTING' at the top-center. Soft studio keylighting from the left side creates elegant monochrome gradients. Educational and professional technical style.",
  "prompt_json": {
    "platform": "Midjourney",
    "scene": {
      "background": "dark slate table, dark gray shadows (#121212)",
      "framing": "16:9 centered still-life shot",
      "depth": "sharp focus on camera details"
    },
    "subject": {
      "description": "vintage manual rangefinder camera",
      "expression": "none",
      "position": "center of frame",
      "gesture": "none"
    },
    "colors": {
      "dominant": "#121212",
      "accent": "#737373",
      "text_color": "#ffffff"
    },
    "text_overlay": {
      "content": "PRO LIGHTING",
      "position": "top-center",
      "style": "clean modern minimalist typography",
      "size": "medium"
    },
    "lighting": "soft side studio lighting with monochrome gradients",
    "mood": "educational, artistic, professional photography expertise",
    "psychological_trigger": "educational",
    "emotional_register": {
      "urgency": 3,
      "trust": 9,
      "excitement": 5
    },
    "viewer_action_intent": "master professional studio lighting setups using simple monochrome equipment",
    "platform_modifiers": "--ar 16:9 --q 2 --style raw --v 6.1"
  },
  "generation_prompt": "Minimalist black and white photography of a classic rangefinder film camera on a dark table, dominant dark gray background (#121212), metallic silver accents (#e5e5e5), bold clean white typography text overlay 'PRO LIGHTING' at the top, elegant soft studio lighting from the side, sharp details, cinematic --ar 16:9 --q 2 --style raw --v 6.1",
  "adjacent_variants": [
    { "label": "Color shift", "prompt": "Add a single accent color by making the text overlay glowing neon yellow (#facc15) while keeping the rest monochrome." },
    { "label": "Minimal", "prompt": "Pure black and white close-up of the camera lens reflection with no text overlay." },
    { "label": "High energy", "prompt": "Extreme angle of the camera with dramatic high-contrast flash lighting and large italic font." }
  ]
}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Always return a single valid JSON object. No preamble, no markdown formatting (do not wrap in 'json' or code blocks). Return raw JSON only.

JSON SCHEMA STRUCTURE:

{
  "error": {
    "is_invalid": false,
    "reason": null
  },
  "analysis": {
    "composition": {
      "layout_pattern": "subject-left, centered, split, or text-dominant",
      "framing": "close-up, mid-shot, or wide",
      "rule_of_thirds": "detailed description of third grid placement",
      "element_hierarchy": "comma-separated visual hierarchy order"
    },
    "color_palette": {
      "dominant_bg": "Hex code of dominant background color",
      "accents": ["List of hex codes for accent colors"],
      "text_color": "Hex code of text overlay color",
      "temp": "Overall color temperature: warm, cool, or neutral. Derive this directly from the hex codes above.",
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
      "viewer_action_intent": "Detailed viewer payoff description. Must NEVER be identical to primary_trigger.",
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
      "dominant": "Hex code",
      "accent": "Hex code",
      "text_color": "Hex code"
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
    "viewer_action_intent": "Viewer intent payoff",
    "platform_modifiers": "Modifiers"
  },
  "generation_prompt": "Platform-specific copyable prompt",
  "adjacent_variants": [
    { "label": "Color shift", "prompt": "One sentence variant prompt" },
    { "label": "Minimal", "prompt": "One sentence variant prompt" },
    { "label": "High energy", "prompt": "One sentence variant prompt" }
  ]
}`;

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
