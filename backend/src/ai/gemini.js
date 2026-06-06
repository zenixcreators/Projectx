const fetch = require("node-fetch");

/**
 * Reusable Google Gemini API caller function.
 * Uses the gemini-1.5-flash model to generate content.
 * 
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @returns {Promise<string>}
 */
async function callGemini(systemPrompt, userPrompt) {
  let apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment variables");
  }

  // Strip leading equal sign if it was parsed from duplicate equals in .env
  if (apiKey.startsWith("=")) {
    apiKey = apiKey.substring(1);
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        parts: [
          {
            text: `${systemPrompt}\n\n${userPrompt}`
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.9,
      maxOutputTokens: 4096
    }
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let errMsg = response.statusText;
    try {
      const errData = await response.json();
      errMsg = errData.error?.message || JSON.stringify(errData);
    } catch (e) {
      // Fallback to response status text
    }
    throw new Error(`Gemini API error: ${errMsg}`);
  }

  const data = await response.json();
  try {
    return data.candidates[0].content.parts[0].text;
  } catch (e) {
    throw new Error("Gemini API error: Failed to parse generated content from response");
  }
}

module.exports = callGemini;
