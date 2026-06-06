const axios = require('axios');
const { DNA_SYSTEM_PROMPT } = require('../prompting/promptBuilder');
const { normalizeDna } = require('../scoring/thumbnailScorer');

async function analyzeThumbnailConcept(prompt, selectedModel, selectedAspectRatio) {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    let dnaData = null;
    try {
        const groqRes = await axios.post(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: DNA_SYSTEM_PROMPT },
                    { role: "user", content: `Thumbnail concept: ${prompt}\nPsychology mode/model hint: ${selectedModel}\nAspect ratio: ${selectedAspectRatio}` }
                ],
                temperature: 0.45,
                response_format: { type: "json_object" }
            },
            { headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" } }
        );
        dnaData = JSON.parse(groqRes.data.choices[0].message.content);
    } catch (e) {
        console.warn('[Psychology Analyzer] Groq DNA parsing failed:', e.message);
        // Fallback handled during normalization
    }

    return normalizeDna(dnaData, prompt);
}

module.exports = { analyzeThumbnailConcept };
