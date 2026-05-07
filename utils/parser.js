function cleanText(text) {
  return text
    .replace(/```json|```/g, "")
    .replace(/Here is[\s\S]*?:/i, "")
    .trim();
}

// Surgically close a truncated JSON string
function closeTruncatedJson(str) {
  let s = str.trimEnd();

  // Remove trailing incomplete key or value
  s = s.replace(/,?\s*"[^"]*$/, "");             // incomplete key
  s = s.replace(/,?\s*"[^"]*":\s*"[^"]*$/, ""); // incomplete value
  s = s.replace(/,\s*$/, "");                    // trailing comma

  // Close open arrays then objects
  const openArrays = (s.match(/\[/g) || []).length - (s.match(/\]/g) || []).length;
  for (let i = 0; i < openArrays; i++) s += "]";

  const openObjs = (s.match(/\{/g) || []).length - (s.match(/\}/g) || []).length;
  for (let i = 0; i < openObjs; i++) s += "}";

  return s;
}

function safeJsonParse(text) {
  const cleaned = cleanText(text);
  const match = cleaned.match(/\{[\s\S]*/);
  if (!match) {
    console.error("Parse failed: No JSON found");
    return null;
  }

  const raw = match[0];

  try { return JSON.parse(raw); } catch (_) {}
  try { return JSON.parse(closeTruncatedJson(raw)); } catch (_) {}

  console.error("Parse failed: Could not recover JSON");
  return null;
}

function parseResponse(text) {
  const data = safeJsonParse(text);
  if (!data) {
    return {
      hook: "Failed to parse AI output",
      setup: "", insight: "", value: "", loop: "", cta: "", hashtags: []
    };
  }
  return data;
}

module.exports = parseResponse;