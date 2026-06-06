function buildFallbackDna(prompt) {
    return {
        optimizedPrompt: `High-CTR YouTube thumbnail, ${prompt}, dramatic close-up foreground subject, strong emotional expression, clear silhouette, cinematic rim light, high contrast background separation, clean negative space for title overlay, sharp focus, premium editorial color grade, 16:9 composition, no text, no logo`,
        negativePrompt: 'boring static pose, flat lighting, low contrast, cluttered background, blurry, distorted face, extra fingers, bad anatomy, generated text, watermark, logo',
        score: '6.8/10',
        scoreWidth: '68%',
        scoreStatus: 'Needs Stronger Hook',
        trigger: 'Curiosity + Contrast',
        archetype: 'Concept Hook',
        intent: 'Open Loop Click',
        description: 'The concept has a usable visual hook but needs stronger emotion and clearer stakes.',
        colorDesc: 'A controlled contrast palette improves mobile separation and subject clarity.',
        intentDesc: 'The viewer needs a stronger reason to investigate the scene.',
        eyeFlow: 'Viewer attention moves from the main face or object to the contrast area, then to the title space.',
        mobileScore: '6.8 / 10',
        swatches: ['#111827', '#F59E0B', '#F8FAFC', '#7C3AED']
    };
}

module.exports = { buildFallbackDna };
