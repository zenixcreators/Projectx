const { analyzeThumbnailConcept } = require('./analysis/psychologyAnalyzer');
const { buildGenerationPrompt } = require('./prompting/cinematicAmplifier');
const { getProvider } = require('./providers/providerFactory');
const { fetchImage, storeImageBuffer } = require('./utils/imageStorage');

async function generateThumbnail({ prompt, provider, aspectRatio, hostedImageUrl, strength }) {
    console.log(`[Orchestrator] Starting generation for concept: "${prompt}"`);

    const selectedProviderName = provider || 'huggingface';
    const selectedAspectRatio = aspectRatio || '16:9';

    // 1. Thumbnail Psychology & DNA Extraction
    console.log(`[Orchestrator] Analyzing psychology...`);
    // Passing the provider name as a hint to the LLM
    const dnaData = await analyzeThumbnailConcept(prompt, selectedProviderName, selectedAspectRatio);

    // 2. Cinematic Prompt Amplification
    const optimizedPrompt = buildGenerationPrompt(dnaData.optimizedPrompt, dnaData.negativePrompt);

    // 3. Image Generation via Provider Factory
    console.log(`[Orchestrator] Routing to provider: ${selectedProviderName}`);
    const seed = Math.floor(Math.random() * 999999999);

    const ImageProvider = getProvider(selectedProviderName);
    const generationResult = await ImageProvider.generate({
        optimizedPrompt,
        selectedModel: selectedProviderName,
        selectedAspectRatio,
        hostedImageUrl,
        strength,
        seed
    });

    // 4. Download and Store Image
    console.log(`[Orchestrator] Storing generated image...`);

    let localImageUrl;

    if (generationResult.imageBuffer) {
        // Provider returned buffer directly (e.g. HuggingFace, Gemini)
        localImageUrl = await storeImageBuffer(generationResult.imageBuffer);
    } else {
        // Provider returned a URL (e.g. fal-ai)
        const imageResponse = await fetchImage(generationResult.providerImageUrl);
        localImageUrl = await storeImageBuffer(imageResponse);
    }

    // 5. Final Output Compilation
    return {
        imageUrl: localImageUrl,
        dna: dnaData,
        optimizedPrompt,
        rawResult: {
            provider: generationResult.providerName,
            model: generationResult.model,
            status: 'success',
            sourceUrl: generationResult.providerImageUrl
        }
    };
}

module.exports = { generateThumbnail };
