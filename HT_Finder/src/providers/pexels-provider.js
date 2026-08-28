/**
 * Asset Finder - Pexels Provider
 */

class PexelsProvider extends window.ProviderBase {
  constructor() {
    super(window.Constants.PROVIDERS.PEXELS, "Pexels");
  }

  /**
   * Validate API credentials by querying Pexels API
   */
  async testConnection(apiKey) {
    if (!apiKey) return false;
    
    try {
      const url = "https://api.pexels.com/v1/videos/search?query=test&per_page=1";
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": apiKey
        }
      });
      
      return response.status === 200;
    } catch (err) {
      window.Logger.error("PexelsProvider: Connection test failed due to network error", err);
      return false;
    }
  }

  /**
   * Search for videos
   */
  async searchVideos(query, options = {}) {
    if (!this.connected || !this.apiKey) {
      throw new Error("Pexels: Provider not connected. Add an API Key first.");
    }

    const page = options.page || 1;
    const perPage = options.perPage || window.Constants.DEFAULT_PAGE_SIZE;
    
    let url = `https://api.pexels.com/v1/videos/search?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`;
    
    // Apply filters
    if (options.orientation && options.orientation !== "all") {
      url += `&orientation=${options.orientation}`; // landscape, portrait, square
    }
    
    if (options.size && options.size !== "all") {
      url += `&size=${options.size}`; // large, medium, small
    }

    window.Logger.debug(`PexelsProvider: Searching videos with URL: ${url}`);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": this.apiKey
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid API key or unauthorized request to Pexels.");
        }
        throw new Error(`Pexels API responded with status ${response.status}`);
      }

      const data = await response.json();
      
      // Normalize results
      const assets = (data.videos || []).map(video => this.normalizeAsset(video, window.Constants.ASSET_TYPES.VIDEO));
      
      return {
        assets,
        total: data.total_results || 0,
        page: data.page || 1,
        hasMore: !!data.next_page
      };
    } catch (err) {
      window.Logger.error("PexelsProvider: Search videos failed", err);
      throw err;
    }
  }

  /**
   * Search for images
   */
  async searchImages(query, options = {}) {
    if (!this.connected || !this.apiKey) {
      throw new Error("Pexels: Provider not connected. Add an API Key first.");
    }

    const page = options.page || 1;
    const perPage = options.perPage || window.Constants.DEFAULT_PAGE_SIZE;
    
    let url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`;
    
    if (options.orientation && options.orientation !== "all") {
      url += `&orientation=${options.orientation}`;
    }
    if (options.size && options.size !== "all") {
      url += `&size=${options.size}`;
    }

    window.Logger.debug(`PexelsProvider: Searching images with URL: ${url}`);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": this.apiKey
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid API key or unauthorized request to Pexels.");
        }
        throw new Error(`Pexels API responded with status ${response.status}`);
      }

      const data = await response.json();
      const assets = (data.photos || []).map(photo => this.normalizeAsset(photo, window.Constants.ASSET_TYPES.IMAGE));

      return {
        assets,
        total: data.total_results || 0,
        page: data.page || 1,
        hasMore: !!data.next_page
      };
    } catch (err) {
      window.Logger.error("PexelsProvider: Search images failed", err);
      throw err;
    }
  }

  /**
   * Normalize raw JSON payloads to our Unified Asset Model
   */
  normalizeAsset(rawAsset, type) {
    if (type === window.Constants.ASSET_TYPES.VIDEO) {
      // Find a medium quality SD file as preview loop (around 640x360 or SD)
      let previewFile = rawAsset.video_files.find(f => f.quality === "sd" || f.width === 960 || f.width === 640);
      if (!previewFile && rawAsset.video_files.length > 0) {
        // Fallback to first video file
        previewFile = rawAsset.video_files[rawAsset.video_files.length - 1];
      }
      
      // Map and sort download options
      const downloadOptions = rawAsset.video_files.map(file => {
        // Define human readable quality label (e.g. 4K, 1080p, 720p, SD)
        let label = `${file.width}x${file.height}`;
        if (file.width >= 3840) label = `4K (${label})`;
        else if (file.width >= 1920) label = `Full HD 1080p (${label})`;
        else if (file.width >= 1280) label = `HD 720p (${label})`;
        else label = `SD (${label})`;
        
        return {
          quality: label,
          width: file.width,
          height: file.height,
          mimeType: file.file_type || "video/mp4",
          url: file.link
        };
      });

      // Sort: high-res first
      downloadOptions.sort((a, b) => b.width - a.width);

      return {
        id: `${this.id}:${rawAsset.id}`,
        provider: this.id,
        providerAssetId: rawAsset.id.toString(),
        type: window.Constants.ASSET_TYPES.VIDEO,
        title: `Video by ${rawAsset.user?.name || "Pexels Artist"}`,
        creator: rawAsset.user?.name || "Unknown Creator",
        creatorUrl: rawAsset.user?.url || "",
        thumbnailUrl: rawAsset.image || (rawAsset.video_pictures?.[0]?.picture || ""),
        previewUrl: previewFile ? previewFile.link : "",
        duration: rawAsset.duration || 0,
        width: rawAsset.width || 0,
        height: rawAsset.height || 0,
        downloadOptions,
        license: "Pexels License - Free to use",
        attribution: `Video by ${rawAsset.user?.name || "Pexels Creator"} on Pexels`
      };
    } else {
      // IMAGE normalization
      const sizes = [
        { label: "Original (Full Resolution)", url: rawAsset.src.original, key: "original" },
        { label: "Large 2x", url: rawAsset.src.large2x, key: "large2x" },
        { label: "Large", url: rawAsset.src.large, key: "large" },
        { label: "Medium", url: rawAsset.src.medium, key: "medium" },
        { label: "Small", url: rawAsset.src.small, key: "small" }
      ];

      const downloadOptions = sizes
        .filter(s => !!s.url)
        .map(s => {
          let w = 0, h = 0;
          if (s.key === "original") {
            w = rawAsset.width;
            h = rawAsset.height;
          }
          return {
            quality: s.label,
            width: w,
            height: h,
            mimeType: "image/jpeg",
            url: s.url
          };
        });

      return {
        id: `${this.id}:${rawAsset.id}`,
        provider: this.id,
        providerAssetId: rawAsset.id.toString(),
        type: window.Constants.ASSET_TYPES.IMAGE,
        title: `Photo by ${rawAsset.photographer || "Pexels Photographer"}`,
        creator: rawAsset.photographer || "Unknown Photographer",
        creatorUrl: rawAsset.photographer_url || "",
        thumbnailUrl: rawAsset.src.medium || "",
        previewUrl: rawAsset.src.large || "",
        duration: 0,
        width: rawAsset.width || 0,
        height: rawAsset.height || 0,
        downloadOptions,
        license: "Pexels License - Free to use",
        attribution: `Photo by ${rawAsset.photographer || "Pexels Creator"} on Pexels`
      };
    }
  }
}

// Instantiate and register globally
window.PexelsProvider = new PexelsProvider();
if (typeof module !== "undefined") {
  module.exports = window.PexelsProvider;
}
