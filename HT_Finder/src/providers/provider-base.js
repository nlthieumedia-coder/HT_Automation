/**
 * Asset Finder - Base Provider Class
 */

class ProviderBase {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.apiKey = null;
    this.connected = false;
  }

  /**
   * Set API credentials and mark as connected
   */
  connect(apiKey) {
    this.apiKey = apiKey;
    this.connected = !!apiKey;
  }

  /**
   * Clear credentials
   */
  disconnect() {
    this.apiKey = null;
    this.connected = false;
  }

  /**
   * Validate API credentials by querying the API
   * @param {string} apiKey 
   * @returns {Promise<boolean>}
   */
  async testConnection(apiKey) {
    throw new Error(`testConnection() not implemented in provider "${this.id}"`);
  }

  /**
   * Search for videos
   * @param {string} query 
   * @param {Object} options (page, perPage, resolution, orientation, etc.)
   * @returns {Promise<Object>} normalized results object { assets: NormalizedAsset[], total: number, page: number }
   */
  async searchVideos(query, options = {}) {
    throw new Error(`searchVideos() not implemented in provider "${this.id}"`);
  }

  /**
   * Search for images
   * @param {string} query 
   * @param {Object} options 
   * @returns {Promise<Object>} normalized results object
   */
  async searchImages(query, options = {}) {
    throw new Error(`searchImages() not implemented in provider "${this.id}"`);
  }

  /**
   * Normalize raw vendor API asset structure to NormalizedAsset schema
   * @param {Object} rawAsset 
   * @param {string} type "video" | "image"
   * @returns {NormalizedAsset}
   */
  normalizeAsset(rawAsset, type) {
    throw new Error(`normalizeAsset() not implemented in provider "${this.id}"`);
  }
}

window.ProviderBase = ProviderBase;
if (typeof module !== "undefined") {
  module.exports = ProviderBase;
}
