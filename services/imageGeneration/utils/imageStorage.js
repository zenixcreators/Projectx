const axios = require('axios');
const { randomUUID } = require('crypto');

// In-memory store for generated images
// TODO: Replace with S3 or R2 for distributed scalability
const generatedImages = new Map();

async function fetchImage(url) {
    const imageResponse = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 180000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
    });

    const contentType = imageResponse.headers['content-type'] || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
        throw new Error(`Image provider returned ${contentType} instead of an image.`);
    }

    return imageResponse;
}

async function storeImageBuffer(imageResponse) {
    const contentType = imageResponse.headers['content-type'] || 'image/jpeg';
    const imageId = randomUUID();
    
    generatedImages.set(imageId, {
        buffer: Buffer.from(imageResponse.data),
        contentType
    });

    // Cleanup after 1 hour
    setTimeout(() => generatedImages.delete(imageId), 60 * 60 * 1000);
    
    return `/api/generated-images/${imageId}`;
}

function getImage(id) {
    return generatedImages.get(id);
}

module.exports = {
    fetchImage,
    storeImageBuffer,
    getImage
};
