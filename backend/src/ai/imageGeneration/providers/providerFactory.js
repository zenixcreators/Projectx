const hfProvider = require('./hfProvider');

const getProvider = (providerName) => {
    switch (providerName) {
        case 'huggingface':
        case 'hf/flux/dev':
        case 'black-forest-labs/FLUX.1-dev':
            return hfProvider;

        default:
            // HuggingFace is now the global default
            console.log(`[ProviderFactory] Unknown provider "${providerName}", falling back to HuggingFace.`);
            return hfProvider;
    }
};

module.exports = { getProvider };
