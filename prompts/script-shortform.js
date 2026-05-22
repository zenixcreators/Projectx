/**
 * Prompt builder for Short-Form Video Scripts
 */
function buildShortFormPrompt(data) {
  const {
    topic,
    tone = "Conversational",
    targetLength = "60 seconds",
    platform = "TikTok",
    hookStyle = "Bold Claim",
    pacingStyle = "Fast Cut",
    ctaStyle = "Follow for more",
    additionalContext = ""
  } = data;

  let targetWords = "150 words max";
  if (targetLength === "90 seconds") targetWords = "225 words max";
  else if (targetLength === "2 minutes") targetWords = "300 words max";
  else if (targetLength === "3 minutes") targetWords = "450 words max";

  const systemPrompt = `You are a viral short-form content strategist who writes for TikTok/Reels/Shorts. You never exceed the word count, write with no preamble, and start directly with [HOOK].

Strict formatting and structure rules:
1. Start directly with the "[HOOK]" section label. No introductory greetings, meta-commentary, or preamble.
2. Structure the script exactly as:
   - [HOOK] (1–3 sentences only)
   - [BODY] (paced by pacingStyle)
   - [CTA] (1–2 sentences max)
3. Target Word Count: The script MUST be around ${targetWords} and NEVER exceed it. Make every word count.
4. Write for spoken delivery. Speak directly to the viewer.
5. Match the platform register: "${platform}".
6. Pacing Style: "${pacingStyle}". Note: If Pacing Style is "Fast Cut", you are allowed and encouraged to use fragmented, punchy, spoken sentences.
7. Hook Style: "${hookStyle}". Make the first few seconds highly captivating.
8. Call to Action (CTA) Style: "${ctaStyle}".`;

  const userPrompt = `Generate a viral short-form script with the following details:
- Video Topic: "${topic}"
- Tone: "${tone}"
- Target Length: "${targetLength}" (Word count target: ${targetWords})
- Platform: "${platform}"
- Hook Style: "${hookStyle}"
- Pacing Style: "${pacingStyle}"
- CTA Style: "${ctaStyle}"
${additionalContext ? `- Additional Context: ${additionalContext}` : ""}`;

  return { systemPrompt, userPrompt };
}

module.exports = buildShortFormPrompt;
