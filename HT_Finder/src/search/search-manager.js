/**
 * Asset Finder - Search Manager
 */

class SearchManager {
  constructor() {
    this.currentQuery = "";
    this.currentType = window.Constants.ASSET_TYPES.VIDEO;
    this.currentResolution = window.Constants.RESOLUTIONS.ALL;
    this.selectedProviders = [];
  }

  /**
   * Run search queries across all active and selected providers
   * @param {string} query Search terms
   * @param {Object} options Options like page, perPage, type, resolution, and selectedProviders
   * @returns {Promise<Object>} consolidated results: { assets: NormalizedAsset[], hasMore: boolean }
   */
  async search(query, options = {}) {
    this.currentQuery = query;
    this.currentType = options.type || window.Constants.ASSET_TYPES.VIDEO;
    this.currentResolution = options.resolution || window.Constants.RESOLUTIONS.ALL;
    this.selectedProviders = options.selectedProviders || [];

    window.Logger.info(`SearchManager: Querying "${query}" [Type: ${this.currentType}, Res: ${this.currentResolution}]`);

    // Get active providers matching user selection
    const activeProviders = window.ProviderManager.getActiveProviders(this.selectedProviders);
    if (activeProviders.length === 0) {
      window.Logger.warn("SearchManager: No connected and checked providers found.");
      return { assets: [], hasMore: false };
    }

    // Prepare options for each provider
    const providerOptions = {
      page: options.page || 1,
      perPage: options.perPage || window.Constants.DEFAULT_PAGE_SIZE,
      orientation: "all"
    };

    // If resolution filter is 4K, we can recommend "large" size to provider API
    if (this.currentResolution === window.Constants.RESOLUTIONS["4K"]) {
      providerOptions.size = "large";
    }

    // Run searches in parallel
    const searchPromises = activeProviders.map(async (provider) => {
      try {
        let result;
        if (this.currentType === window.Constants.ASSET_TYPES.VIDEO) {
          result = await provider.searchVideos(query, providerOptions);
        } else {
          result = await provider.searchImages(query, providerOptions);
        }
        return { providerId: provider.id, success: true, result };
      } catch (err) {
        window.Logger.error(`SearchManager: Search failed on provider "${provider.name}"`, err);
        return { providerId: provider.id, success: false, error: err.message };
      }
    });

    const searchResults = await Promise.all(searchPromises);

    // Group assets by provider
    const providerAssetLists = [];
    let hasMoreCombined = false;

    searchResults.forEach(res => {
      if (res.success && res.result) {
        let filteredAssets = res.result.assets || [];

        // Apply resolution filtering post-fetch for precision
        filteredAssets = this.filterAssetsByResolution(filteredAssets, this.currentResolution);

        if (filteredAssets.length > 0) {
          providerAssetLists.push(filteredAssets);
        }
        if (res.result.hasMore) {
          hasMoreCombined = true;
        }
      }
    });

    // Merge/Interleave results evenly (Pexels, Pixabay, Pexels, Pixabay...)
    const mergedAssets = this.interleaveAssets(providerAssetLists);

    return {
      assets: mergedAssets,
      hasMore: hasMoreCombined
    };
  }

  /**
   * Filter assets based on resolution width constraints
   */
  filterAssetsByResolution(assets, resolution) {
    if (resolution === window.Constants.RESOLUTIONS.ALL) return assets;

    return assets.filter(asset => {
      // Find the maximum available quality width in downloadOptions
      const maxWidth = asset.downloadOptions.reduce((max, opt) => {
        return opt.width > max ? opt.width : max;
      }, asset.width || 0);

      if (resolution === window.Constants.RESOLUTIONS.HD) {
        return maxWidth >= 1280; // 720p+
      }
      if (resolution === window.Constants.RESOLUTIONS.FULLHD) {
        return maxWidth >= 1920; // 1080p+
      }
      if (resolution === window.Constants.RESOLUTIONS["4K"]) {
        return maxWidth >= 3840; // 4K+
      }
      return true;
    });
  }

  /**
   * Interleaves arrays of assets to distribute results evenly
   * @param {NormalizedAsset[][]} assetLists Array of asset arrays
   * @returns {NormalizedAsset[]}
   */
  interleaveAssets(assetLists) {
    if (assetLists.length === 0) return [];
    if (assetLists.length === 1) return assetLists[0];

    const interleaved = [];
    const pointers = new Array(assetLists.length).fill(0);
    let itemsAdded = true;

    while (itemsAdded) {
      itemsAdded = false;
      for (let i = 0; i < assetLists.length; i++) {
        const list = assetLists[i];
        const ptr = pointers[i];
        
        if (ptr < list.length) {
          interleaved.push(list[ptr]);
          pointers[i]++;
          itemsAdded = true;
        }
      }
    }

    return interleaved;
  }

  /**
   * Extract metadata from a pasted URL using yt-dlp
   */
  async loadDirectUrl(url) {
    window.Logger.info(`Đang đọc metadata từ liên kết: ${url}`);
    try {
      const info = await window.DownloadManager.extractUrl(url);
      return {
            id: `ytdlp:${info.id || 'direct'}`,
            provider: "ytdlp",
            providerAssetId: info.id || Date.now().toString(),
            type: window.Constants.ASSET_TYPES.VIDEO,
            title: info.title || "Video từ liên kết",
            creator: info.uploader || info.author || "Không rõ",
            creatorUrl: info.webpage_url || url,
            thumbnailUrl: info.thumbnail || "",
            previewUrl: "",
            duration: info.duration || 0,
            width: info.width || 0,
            height: info.height || 0,
            downloadOptions: [
              {
                quality: "Chất lượng tốt nhất",
                width: info.width || 1920,
                height: info.height || 1080,
                mimeType: "video/mp4",
                url: url,
                formatCode: "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]"
              },
              {
                quality: "Full HD 1080p",
                width: 1920,
                height: 1080,
                mimeType: "video/mp4",
                url: url,
                formatCode: "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080][ext=mp4]"
              },
              {
                quality: "HD 720p",
                width: 1280,
                height: 720,
                mimeType: "video/mp4",
                url: url,
                formatCode: "bv*[height<=720][ext=mp4]+ba[ext=m4a]/b[height<=720][ext=mp4]"
              }
            ],
            license: info.license || "Liên kết trực tiếp",
            attribution: `${info.extractor_key || 'URL'}: ${url}`
      };
    } catch (error) {
      window.Logger.error("Không đọc được metadata video", error);
      throw new Error("Không đọc được video. Hãy kiểm tra liên kết công khai và Bridge.");
    }
  }
}

// Instantiate and expose globally
window.SearchManager = new SearchManager();
if (typeof module !== "undefined") {
  module.exports = window.SearchManager;
}
