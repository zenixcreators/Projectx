/**
 * promptEnhancer.js
 * Automatically upgrades a simple user prompt into a
 * high-quality, photorealistic SDXL-optimized prompt.
 * Includes face/human detection for sharper facial rendering.
 */

// ─── Quality Boosters ─────────────────────────────────────────────────────────
const QUALITY_BOOSTERS = [
    'RAW photo',
    'DSLR quality',
    '8K UHD',
    'ultra-realistic',
    'photorealistic',
    'hyperrealistic',
    'sharp focus',
    'high detail',
    'professional photography',
    'masterpiece'
].join(', ');

// ─── Face Boosters (injected when human/face detected in prompt) ──────────────
const FACE_BOOSTERS = [
    'highly detailed face',
    'sharp facial features',
    'detailed eyes',
    'realistic skin texture',
    'subsurface scattering',
    'natural skin pores',
    'clear facial definition',
    'professional portrait lighting',
    'sharp facial focus',
    '85mm portrait lens'
].join(', ');

// ─── Lighting Presets ─────────────────────────────────────────────────────────
const LIGHTING = {
    default: 'soft natural lighting, golden hour, cinematic light',
    indoor: 'warm indoor lighting, soft diffused light, studio lighting',
    outdoor: 'natural sunlight, golden hour, volumetric lighting',
    dramatic: 'dramatic side lighting, deep shadows, cinematic',
    studio: 'professional studio lighting, softbox, even exposure',
    night: 'moonlight, atmospheric fog, rim lighting, dark cinematic'
};

// ─── Negative Prompt ──────────────────────────────────────────────────────────
const NEGATIVE_PROMPT_BASE = [
    'cartoon', 'anime', 'illustration', 'painting', 'drawing', 'CGI', 'render', '3D',
    'blurry', 'low quality', 'low resolution', 'worst quality',
    'watermark', 'text', 'logo', 'oversaturated', 'overexposed', 'underexposed',
    'noisy', 'grain', 'duplicate', 'mutated', 'disfigured'
].join(', ');

// Extra face negative terms — only added when human/face detected
const FACE_NEGATIVE = [
    'bad face', 'blurry face', 'dull face', 'deformed face',
    'bad anatomy', 'bad hands', 'extra fingers', 'missing fingers',
    'bad eyes', 'cross-eyed', 'asymmetrical face', 'ugly', 'deformed',
    'poorly drawn face', 'mutation', 'extra limbs', 'cloned face',
    'long neck', 'malformed hands'
].join(', ');

// ─── Camera Settings ──────────────────────────────────────────────────────────
const CAMERA_DEFAULT = 'shot on Canon EOS R5, 85mm lens, f/1.8 aperture, bokeh background';
const CAMERA_PORTRAIT = 'shot on Sony A7R IV, 85mm portrait lens, f/1.4 aperture, shallow depth of field, sharp subject focus';

// ─── Human/Face keyword detector ─────────────────────────────────────────────
const HUMAN_KEYWORDS = [
    'man', 'woman', 'boy', 'girl', 'person', 'people', 'human', 'face',
    'portrait', 'character', 'guy', 'lady', 'child', 'kid', 'teenager',
    'adult', 'model', 'athlete', 'soldier', 'student', 'chef', 'doctor',
    'standing', 'sitting', 'walking', 'running', 'smiling', 'looking'
];

function containsHuman(prompt) {
    const lower = prompt.toLowerCase();
    return HUMAN_KEYWORDS.some(kw => lower.includes(kw));
}

function detectLighting(prompt) {
    const lower = prompt.toLowerCase();
    if (lower.includes('studio') || lower.includes('portrait')) return LIGHTING.studio;
    if (lower.includes('outdoor') || lower.includes('outside') ||
        lower.includes('street') || lower.includes('park')) return LIGHTING.outdoor;
    if (lower.includes('kitchen') || lower.includes('room') ||
        lower.includes('indoor') || lower.includes('office')) return LIGHTING.indoor;
    if (lower.includes('night') || lower.includes('dark') ||
        lower.includes('fog') || lower.includes('shadow')) return LIGHTING.night;
    return LIGHTING.default;
}

// ─── Main Enhancer ────────────────────────────────────────────────────────────
/**
 * Enhances a basic user prompt into a full SDXL-optimized prompt.
 * Automatically detects humans/faces and injects face-specific boosters.
 * @param {string} userPrompt
 * @returns {{ positive: string, negative: string, hasFace: boolean }}
 */
function enhancePrompt(userPrompt) {
    if (!userPrompt || typeof userPrompt !== 'string') {
        throw new Error('A valid prompt string is required.');
    }

    const trimmed = userPrompt.trim();
    const hasFace = containsHuman(trimmed);
    const lighting = detectLighting(trimmed);
    const camera = hasFace ? CAMERA_PORTRAIT : CAMERA_DEFAULT;
    const negative = hasFace
        ? `${NEGATIVE_PROMPT_BASE}, ${FACE_NEGATIVE}`
        : NEGATIVE_PROMPT_BASE;

    const parts = [trimmed, QUALITY_BOOSTERS, lighting, camera];
    if (hasFace) {
        parts.splice(1, 0, FACE_BOOSTERS); // inject face boosters right after user prompt
    }

    const positive = parts.join(', ');

    if (hasFace) {
        console.log('[PromptEnhancer] 👤 Human/face detected — face boosters injected.');
    }

    return { positive, negative, hasFace };
}

module.exports = { enhancePrompt, NEGATIVE_PROMPT_BASE, FACE_NEGATIVE };