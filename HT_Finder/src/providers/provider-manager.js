/**
 * Asset Finder - Provider Manager
 */

class ProviderManager {
  constructor() {
    this.providers = new Map();
  }

  /**
   * Register a new stock site provider
   */
  registerProvider(provider) {
    if (this.providers.has(provider.id)) {
      window.Logger.warn(`ProviderManager: Provider with ID "${provider.id}" is already registered.`);
      return;
    }
    this.providers.set(provider.id, provider);
    window.Logger.debug(`ProviderManager: Registered provider "${provider.name}" (${provider.id})`);
  }

  /**
   * Initialize providers by checking stored credentials
   */
  async init() {
    window.Logger.info("ProviderManager: Bootstrapping stock providers...");
    
    // Register Pexels
    if (window.PexelsProvider) {
      this.registerProvider(window.PexelsProvider);
    }

    // Pixabay registration placeholder (Milestone 7 will load it)
    if (window.PixabayProvider) {
      this.registerProvider(window.PixabayProvider);
    }

    // Register YouTube
    if (window.YouTubeProvider) {
      this.registerProvider(window.YouTubeProvider);
    }

    // Register Wikimedia
    if (window.WikimediaProvider) {
      this.registerProvider(window.WikimediaProvider);
    }

    // Connect providers with saved credentials
    for (const [id, provider] of this.providers.entries()) {
      let key = null;
      if (id === window.Constants.PROVIDERS.PEXELS) {
        key = await window.CredentialManager.getPexelsKey();
      } else if (id === window.Constants.PROVIDERS.PIXABAY) {
        key = await window.CredentialManager.getPixabayKey();
      } else if (id === window.Constants.PROVIDERS.YOUTUBE) {
        key = "keyless"; // YouTube search uses yt-dlp which is keyless
      } else if (id === window.Constants.PROVIDERS.WIKIMEDIA) {
        key = "keyless"; // Wikimedia is keyless
      }

      if (key) {
        provider.connect(key);
        window.Logger.info(`ProviderManager: Auto-connected provider "${provider.name}"`);
      } else {
        provider.disconnect();
      }
    }
  }

  getProvider(id) {
    return this.providers.get(id);
  }

  hasProvider(id) {
    return this.providers.has(id);
  }

  /**
   * Connect a specific provider at runtime
   */
  connectProvider(id, apiKey) {
    const provider = this.getProvider(id);
    if (provider) {
      provider.connect(apiKey);
      window.Logger.info(`ProviderManager: Connected "${provider.name}" at runtime.`);
    }
  }

  /**
   * Disconnect a provider
   */
  disconnectProvider(id) {
    const provider = this.getProvider(id);
    if (provider) {
      provider.disconnect();
      window.Logger.info(`ProviderManager: Disconnected "${provider.name}" at runtime.`);
    }
  }

  /**
   * Get all connected providers
   * @returns {ProviderBase[]}
   */
  getConnectedProviders() {
    return Array.from(this.providers.values()).filter(p => p.connected);
  }

  /**
   * Get connected and active providers based on UI selections
   * @param {string[]} selectedIds List of provider IDs checked in UI
   * @returns {ProviderBase[]}
   */
  getActiveProviders(selectedIds = []) {
    return Array.from(this.providers.values()).filter(p => p.connected && selectedIds.includes(p.id));
  }
}

// Instantiate and expose globally
window.ProviderManager = new ProviderManager();
if (typeof module !== "undefined") {
  module.exports = window.ProviderManager;
}
