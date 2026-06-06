const BaseProvider = require('./baseProvider');
const axios = require('axios');
const sharp = require('sharp');
const { enhancePrompt } = require('./promptEnhancer');

class HuggingFaceProvider extends BaseProvider {
    constructor() {
        super('huggingface');
    }

    async generate({ optimizedPrompt, selectedAspectRatio, seed }) {
        console.log(`[HuggingFaceProvider] Initiating generation with SDXL via nScale...`);

        const hfToken = process.env.HF_API_TOKEN;
        if (!hfToken) throw new Error("HF_API_TOKEN is missing from your .env file.");

        console.log(`[HuggingFaceProvider] Target aspect ratio: ${selectedAspectRatio}`);

        const { positive: enhancedPrompt, negative: negativePrompt, hasFace } = enhancePrompt(optimizedPrompt);
        console.log(`[HuggingFaceProvider] Enhanced Prompt: ${enhancedPrompt.substring(0, 120)}...`);

        try {
            const response = await axios.post(
                'https://router.huggingface.co/nscale/v1/images/generations',
                {
                    model: 'stabilityai/stable-diffusion-xl-base-1.0',
                    prompt: enhancedPrompt,
                    negative_prompt: negativePrompt,
                    response_format: 'b64_json',
                    width: 1024,
                    height: 1024,
                    num_inference_steps: 40,
                    guidance_scale: 7.5,
                    seed: seed
                },
                {
                    headers: {
                        'Authorization': `Bearer ${hfToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 90000
                }
            );

            const b64Data = response.data?.data?.[0]?.b64_json;
            if (!b64Data) throw new Error("No image data found in HuggingFace response.");

            let imageBuffer = Buffer.from(b64Data, 'base64');

            // ✅ Apply face sharpening if human was detected in prompt
            if (hasFace) {
                console.log(`[HuggingFaceProvider] 👤 Applying face sharpening pass...`);
                imageBuffer = await this._sharpenFaces(imageBuffer);
            }

            // ✅ Crop to requested aspect ratio
            const croppedBuffer = await this._cropToAspectRatio(imageBuffer, selectedAspectRatio);
            console.log(`[HuggingFaceProvider] ✅ Image generated and cropped to ${selectedAspectRatio} successfully.`);

            return {
                imageBuffer: {
                    data: croppedBuffer,
                    headers: { 'content-type': 'image/png' }
                },
                providerName: 'huggingface',
                model: 'stable-diffusion-xl-base-1.0',
                providerImageUrl: null
            };

        } catch (error) {
            const status = error.response?.status;
            if (status === 401) throw new Error("HuggingFace Unauthorized (401): HF_API_TOKEN is invalid.");
            if (status === 403) throw new Error("HuggingFace Forbidden (403): Token lacks 'Inference' permissions. Visit hf.co/settings/tokens.");
            if (status === 404) throw new Error("HuggingFace Not Found (404): API endpoint or model not found.");
            if (status === 410) throw new Error("HuggingFace Gone (410): This API endpoint has been permanently removed.");
            if (status === 429) throw new Error("HuggingFace Rate Limit (429): Too many requests. Wait a few minutes.");
            if (status === 503) throw new Error("HuggingFace Unavailable (503): Model loading. Retry in 30s.");

            const errorMessage = error.response?.data?.error || error.message;
            console.error(`[HuggingFaceProvider] Generation Error:`, errorMessage);
            throw new Error(`HuggingFace Generation Failed: ${errorMessage}`);
        }
    }

    /**
     * Applies a multi-pass sharpening pipeline to enhance facial detail.
     * Uses Sharp's unsharp mask — best balance of sharpness without artifacts.
     */
    async _sharpenFaces(buffer) {
        return await sharp(buffer)
            // Pass 1 — Light sharpen to recover edge detail
            .sharpen({
                sigma: 0.8,       // Radius of the sharpening kernel
                m1: 1.5,          // Flat area sharpening
                m2: 0.5,          // Jagged area sharpening (prevents halos)
                x1: 2,
                y2: 15,
                y3: 25
            })
            // Pass 2 — Subtle clarity boost (local contrast)
            .modulate({
                brightness: 1.02,  // Very slight brightness lift
                saturation: 1.05   // Slight saturation for skin vibrancy
            })
            // Pass 3 — Mild noise reduction to clean up artifacts
            .median(1)
            .png()
            .toBuffer();
    }

    /**
     * Crops a 1024x1024 buffer to the target aspect ratio using Sharp center-crop.
     */
    async _cropToAspectRatio(buffer, aspectRatio) {
        const outputSizes = {
            '16:9': { width: 1024, height: 576 },
            '9:16': { width: 576, height: 1024 },
            '1:1': { width: 1024, height: 1024 },
            '4:3': { width: 1024, height: 768 },
            '3:4': { width: 768, height: 1024 }
        };

        const target = outputSizes[aspectRatio] || outputSizes['16:9'];

        if (target.width === 1024 && target.height === 1024) {
            return buffer;
        }

        const croppedBuffer = await sharp(buffer)
            .resize({
                width: target.width,
                height: target.height,
                fit: 'cover',
                position: 'centre'
            })
            .png()
            .toBuffer();

        console.log(`[HuggingFaceProvider] Cropped: 1024x1024 → ${target.width}x${target.height}`);
        return croppedBuffer;
    }
}

module.exports = new HuggingFaceProvider();