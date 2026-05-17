function buildGenerationPrompt(optimizedPrompt, negativePrompt) {
    const prompt = [
        optimizedPrompt,
        'ultra sharp, high resolution, professional YouTube thumbnail, dramatic depth, crisp subject edges, no compression artifacts',
        `avoid: ${negativePrompt}`
    ].join(', ');

    return prompt.length > 1800 ? prompt.slice(0, 1800) : prompt;
}

module.exports = { buildGenerationPrompt };
