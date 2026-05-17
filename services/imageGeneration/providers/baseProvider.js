class BaseProvider {
    constructor(providerName) {
        this.providerName = providerName;
    }

    /**
     * @param {Object} params
     * @param {string} params.optimizedPrompt
     * @param {string} params.selectedModel
     * @param {number} params.seed
     * @param {string} params.selectedAspectRatio
     * @returns {Promise<{providerImageUrl: string, providerName: string, model: string}>}
     */
    async generate(params) {
        throw new Error(`generate() must be implemented by ${this.constructor.name}`);
    }
}

module.exports = BaseProvider;
