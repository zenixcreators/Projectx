const path = require("path");
const fs = require("fs");

function processTenglish(segments) {
  try {
    const dictPath = path.join(__dirname, "../backend/src/tenglishDict.json");
    if (!fs.existsSync(dictPath)) {
      console.warn("Tenglish dictionary file not found at:", dictPath);
      return segments;
    }
    const dict = JSON.parse(fs.readFileSync(dictPath, "utf-8"));
    
    return segments.map(seg => {
      if (!seg.text) return seg;
      const words = seg.text.split(/(\s+)/);
      const mapped = words.map(w => {
        const clean = w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").trim();
        if (dict[clean]) {
          return w.replace(clean, dict[clean]);
        }
        return w;
      });
      return { ...seg, text: mapped.join("") };
    });
  } catch (err) {
    console.error("Tenglish processing error:", err.message);
    return segments;
  }
}

const testSegments = [
  { text: "ఈ రోజు యూట్యూబ్ లో ఒక కొత్త వీడియో అప్లోడ్ చేసాను." },
  { text: "దయచేసి నా ఛానల్ కి సబ్‌స్క్రైబ్ చేసుకోండి, మరియు కామెంట్ రాయండి." },
  { text: "మనీ మరియు సక్సెస్ కోసం కొన్ని ముఖ్యమైన హ్యాబిట్స్ ఇవి." }
];

console.log("Input:", JSON.stringify(testSegments, null, 2));
const output = processTenglish(testSegments);
console.log("Processed:", JSON.stringify(output, null, 2));
