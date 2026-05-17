const express = require('express');
const router = express.Router();
const multer = require('multer');
const { generateThumbnail } = require('../services/imageGeneration/orchestrator');
const { getImage } = require('../services/imageGeneration/utils/imageStorage');
// Auth removed

const upload = multer({ storage: multer.memoryStorage() });

// Serve generated images from memory store
router.get('/api/generated-images/:id', (req, res) => {
    const image = getImage(req.params.id);

    if (!image) {
        return res.status(404).send('Generated image not found or expired.');
    }

    res.set('Content-Type', image.contentType);
    res.set('Cache-Control', 'public, max-age=3600');
    return res.send(image.buffer);
});

// Main intelligent generation route
router.post('/api/generate-image', upload.single('referenceImage'), async (req, res) => {
    try {
        const { prompt, modelId, aspectRatio, strength, provider } = req.body;

        if (!prompt) return res.status(400).json({ success: false, error: 'Prompt is required.' });

        // Call Orchestrator
        const result = await generateThumbnail({
            prompt,
            provider,
            aspectRatio,
            strength: strength ? parseFloat(strength) : 0.6
        });

        return res.status(200).json({ success: true, ...result });

    } catch (error) {
        const errMsg =
            error.response?.data?.error?.message ||
            error.response?.data?.error ||
            error.response?.statusText ||
            error.code ||
            error.message ||
            String(error);

        console.error('[Generation Route] Error:', errMsg);
        return res.status(500).json({ success: false, error: errMsg });
    }
});

module.exports = router;
