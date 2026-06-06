const { buildFallbackDna } = require('./fallbackScorer');

function parseScore(value) {
    const match = String(value || '').match(/(\d+(?:\.\d+)?)/);
    const score = match ? Number(match[1]) : 6.8;
    return Math.min(9.7, Math.max(2.5, score));
}

function scoreStatus(score) {
    if (score >= 9) return 'Elite Hook';
    if (score >= 8) return 'Strong CTR Potential';
    if (score >= 7) return 'Usable With Tweaks';
    if (score >= 5) return 'Needs Stronger Hook';
    return 'Weak Thumbnail';
}

function calibrateScore(score, prompt) {
    const text = String(prompt || '').toLowerCase();
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const hasEmotion = /(shock|fear|angry|cry|secret|mystery|danger|surprise|hidden|betray|caught|exposed|impossible|before|after|mistake|truth|warning)/.test(text);
    const hasAction = /(holding|running|escaping|revealing|opening|breaking|pointing|fighting|discovering|transforming|losing|winning)/.test(text);
    const isGenericPortrait = /(portrait|man|woman|person|face|sitting|standing)/.test(text) && !hasEmotion && !hasAction;

    let calibrated = score;
    if (wordCount < 7) calibrated = Math.min(calibrated, 6.4);
    if (isGenericPortrait) calibrated = Math.min(calibrated, 6.6);
    if (!hasEmotion && !hasAction) calibrated = Math.min(calibrated, 7.1);
    if (hasEmotion && hasAction && wordCount >= 10) calibrated = Math.max(calibrated, 7.6);

    return Math.min(9.7, Math.max(2.5, calibrated));
}

function normalizeDna(dna, prompt) {
    const fallback = buildFallbackDna(prompt);
    const merged = { ...fallback, ...dna };
    const scoreNumber = calibrateScore(parseScore(merged.score), prompt);
    
    merged.score = `${scoreNumber.toFixed(1)}/10`;
    merged.scoreWidth = `${Math.round(scoreNumber * 10)}%`;
    merged.scoreStatus = scoreStatus(scoreNumber);
    merged.mobileScore = merged.mobileScore || `${Math.max(4, scoreNumber - 0.3).toFixed(1)} / 10`;
    merged.swatches = Array.isArray(merged.swatches) && merged.swatches.length >= 4 ? merged.swatches.slice(0, 4) : fallback.swatches;
    
    return merged;
}

module.exports = {
    parseScore,
    scoreStatus,
    calibrateScore,
    normalizeDna
};
