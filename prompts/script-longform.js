/**
 * Prompt builder for Long-Form Video Scripts
 */
function buildLongFormPrompt(data) {
  const {
    topic,
    tone = "Educational",
    targetDuration = "5–10 min",
    sectionCount = 5,
    hookStyle = "Question",
    ctaStyle = "Subscribe CTA",
    additionalContext = ""
  } = data;

  let wordCountRange = "1500–2000 words";
  if (targetDuration === "10–20 min") wordCountRange = "2000–3500 words";
  else if (targetDuration === "20–40 min") wordCountRange = "3500–6000 words";
  else if (targetDuration === "40–60 min") wordCountRange = "6000–9000 words";

  const systemPrompt = `You are a professional YouTube scriptwriter with 10+ years experience. Write in natural spoken language not essay prose, never output preamble, and start directly with [HOOK].

Strict formatting and structure rules:
1. Start directly with the "[HOOK]" section label. No introductory greetings, meta-commentary, or preamble.
2. Structure the script exactly as:
   - [HOOK]
   - [INTRO]
   - Body sections labeled sequentially as [SECTION 1: Title] through [SECTION ${sectionCount}: Title] where Title is a relevant subtitle for that section.
   - [OUTRO]
3. Write for the ear, not the eye. Use dynamic, conversational, spoken-delivery style.
4. Match the tone consistently: "${tone}".
5. Target Word Count: The total word count must fall within the range of ${wordCountRange} for a "${targetDuration}" duration video. Do not use placeholders or summaries.
6. Absolutely NO bullet points inside the script body text. Every section must consist of natural conversational paragraphs.`;

  const userPrompt = `Generate a professional long-form script with the following details:
- Video Topic: "${topic}"
- Tone: "${tone}"
- Target Duration: "${targetDuration}" (Word count target: ${wordCountRange})
- Number of Sections: ${sectionCount}
- Hook Style: "${hookStyle}"
- CTA Style: "${ctaStyle}"
${additionalContext ? `- Additional Context: ${additionalContext}` : ""}`;

  return { systemPrompt, userPrompt };
}

module.exports = buildLongFormPrompt;
