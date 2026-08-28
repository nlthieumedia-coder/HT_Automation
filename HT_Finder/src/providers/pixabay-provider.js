/**
 * Asset Finder - Pixabay Provider
 */

class PixabayProvider extends window.ProviderBase {
  constructor() {
    super(window.Constants.PROVIDERS.PIXABAY, "Pixabay");
  }

  /**
   * Validate API credentials by querying Pixabay API
   */
  async testConnection(apiKey) {
    if (!apiKey) return false;
    
    try {
      const url = `https://pixabay.com/api/videos/?key=${apiKey}&q=test&per_page=3`;
      const response = await fetch(url, {
        method: "GET"
      });
      
      return response.status === 200;
    } catch (err) {
      window.Logger.error("PixabayProvider: Connection test failed due to network error", err);
      return false;
    }
  }

  /**
   * Search for videos
   */
  async searchVideos(query, options = {}) {
    if (!this.connected || !this.apiKey) {
      throw new Error("Pixabay: Provider not connected. Add an API Key first.");
    }

    const page = options.page || 1;
    const perPage = options.perPage || window.Constants.DEFAULT_PAGE_SIZE;
    
    let url = `https://pixabay.com/api/videos/?key=${this.apiKey}&q=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`;
    
    window.Logger.debug(`PixabayProvider: Searching videos with URL: ${url}`);

    try {
      const response = await fetch(url, {
        method: "GET"
      });

      if (!response.ok) {
        if (response.status === 400 || response.status === 401) {
          throw new Error("Invalid API key or bad request to Pixabay.");
        }
        throw new Error(`Pixabay API responded with status ${response.status}`);
      }

      const data = await response.json();
      
      // Normalize results
      const assets = (data.hits || []).map(video => this.normalizeAsset(video, window.Constants.ASSET_TYPES.VIDEO));
      
      return {
        assets,
        total: data.totalHits || 0,
        page: page,
        hasMore: (page * perPage) < (data.totalHits || 0)
      };
    } catch (err) {
      window.Logger.error("PixabayProvider: Search videos failed", err);
      throw err;
    }
  }

  /**
   * Search for images
   */
  async searchImages(query, options = {}) {
    if (!this.connected || !this.apiKey) {
      throw new Error("Pixabay: Provider not connected. Add an API Key first.");
    }

    const page = options.page || 1;
    const perPage = options.perPage || window.Constants.DEFAULT_PAGE_SIZE;
    
    let url = `https://pixabay.com/api/?key=${this.apiKey}&q=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`;
    
    // Apply filters
    if (options.orientation && options.orientation !== "all") {
      // Horizontal or Vertical
      const pxaOrientation = options.orientation === "landscape" ? "horizontal" : 
                             options.orientation === "portrait" ? "vertical" : "all";
      if (pxaOrientation !== "all") {
        url += `&orientation=${pxaOrientation}`;
      }
    }
    
    window.Logger.debug(`PixabayProvider: Searching images with URL: ${url}`);

    try {
      const response = await fetch(url, {
        method: "GET"
      });

      if (!response.ok) {
        if (response.status === 400 || response.status === 401) {
          throw new Error("Invalid API key or bad request to Pixabay.");
        }
        throw new Error(`Pixabay API responded with status ${response.status}`);
      }

      const data = await response.json();
      const assets = (data.hits || []).map(photo => this.normalizeAsset(photo, window.Constants.ASSET_TYPES.IMAGE));

      return {
        assets,
        total: data.totalHits || 0,
        page: page,
        hasMore: (page * perPage) < (data.totalHits || 0)
      };
    } catch (err) {
      window.Logger.error("PixabayProvider: Search images failed", err);
      throw err;
    }
  }

  /**
   * Normalize raw JSON payloads to our Unified Asset Model
   */
  normalizeAsset(rawAsset, type) {
    if (type === window.Constants.ASSET_TYPES.VIDEO) {
      // Resolve download options list from the raw hits.videos object keys
      const downloadOptions = [];
      
      if (rawAsset.videos) {
        for (const [key, val] of Object.entries(rawAsset.videos)) {
          if (val && val.url) {
            let label = `${val.width}x${val.height}`;
            if (val.width >= 3840) label = `4K (${label})`;
            else if (val.width >= 1920) label = `Full HD 1080p (${label})`;
            else if (val.width >= 1280) label = `HD 720p (${label})`;
            else label = `${key.toUpperCase()} (${label})`;
            
            downloadOptions.push({
              quality: label,
              width: val.width,
              height: val.height,
              mimeType: "video/mp4",
              url: val.url,
              size: val.size || null
            });
          }
        }
      }

      // Sort: high-res first
      downloadOptions.sort((a, b) => b.width - a.width);

      // Resolve thumbnail and preview
      const mediumVid = rawAsset.videos?.medium || rawAsset.videos?.small || rawAsset.videos?.tiny;
      const tinyVid = rawAsset.videos?.tiny || rawAsset.videos?.small;
      
      const thumbnailUrl = mediumVid?.thumbnail || "";
      const previewUrl = tinyVid?.url || "";

      return {
        id: `${this.id}:${rawAsset.id}`,
        provider: this.id,
        providerAssetId: rawAsset.id.toString(),
        type: window.Constants.ASSET_TYPES.VIDEO,
        title: `Video by ${rawAsset.user || "Pixabay Creator"}`,
        creator: rawAsset.user || "Unknown Creator",
        creatorUrl: rawAsset.user ? `https://pixabay.com/users/${rawAsset.user}-${rawAsset.user_id}/` : "",
        thumbnailUrl: thumbnailUrl,
        previewUrl: previewUrl,
        duration: rawAsset.duration || 0,
        width: rawAsset.videos?.large?.width || 0,
        height: rawAsset.videos?.large?.height || 0,
        downloadOptions,
        license: "Pixabay License - Free to use",
        attribution: `Video by ${rawAsset.user || "Pixabay Creator"} on Pixabay`
      };
    } else {
      // IMAGE normalization
      const downloadOptions = [
        {
          quality: `Original Full Res (${rawAsset.imageWidth}x${rawAsset.imageHeight})`,
          width: rawAsset.imageWidth || 0,
          height: rawAsset.imageHeight || 0,
          mimeType: "image/jpeg",
          url: rawAsset.largeImageURL
        },
        {
          quality: `Medium Web Res (${rawAsset.webformatWidth}x${rawAsset.webformatHeight})`,
          width: rawAsset.webformatWidth || 0,
          height: rawAsset.webformatHeight || 0,
          mimeType: "image/jpeg",
          url: rawAsset.webformatURL
        }
      ];

      return {
        id: `${this.id}:${rawAsset.id}`,
        provider: this.id,
        providerAssetId: rawAsset.id.toString(),
        type: window.Constants.ASSET_TYPES.IMAGE,
        title: `Photo by ${rawAsset.user || "Pixabay Photographer"}`,
        creator: rawAsset.user || "Unknown Photographer",
        creatorUrl: rawAsset.user ? `https://pixabay.com/users/${rawAsset.user}-${rawAsset.user_id}/` : "",
        thumbnailUrl: rawAsset.previewURL || "",
        previewUrl: rawAsset.webformatURL || "",
        duration: 0,
        width: rawAsset.imageWidth || 0,
        height: rawAsset.imageHeight || 0,
        downloadOptions,
        license: "Pixabay License - Free to use",
        attribution: `Photo by ${rawAsset.user || "Pixabay Creator"} on Pixabay`
      };
    }
  }
}

// Instantiate and register globally
window.PixabayProvider = new PixabayProvider();
if (typeof module !== "undefined") {
  module.exports = window.PixabayProvider;
}
