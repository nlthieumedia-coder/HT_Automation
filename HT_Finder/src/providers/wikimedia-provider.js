/**
 * Asset Finder - Wikimedia Commons Provider
 */

class WikimediaProvider extends window.ProviderBase {
  constructor() {
    super(window.Constants.PROVIDERS.WIKIMEDIA, "Wikimedia Commons");
    this.connected = true; // Keyless provider, always connected
  }

  /**
   * Validate API credentials (not needed, always returns true)
   */
  async testConnection(apiKey) {
    return true;
  }

  /**
   * Helper: Fetch image as Base64 using node https client to bypass User-Agent blocks.
   * Uses a unique, non-generic User-Agent to comply with Wikimedia's API policy and avoid 429 rate limits.
   */
  fetchImageAsBase64(url) {
    return new Promise((resolve) => {
      try {
        const https = require("https");
        const parsedUrl = new URL(url);
        const options = {
          hostname: parsedUrl.hostname,
          path: parsedUrl.pathname + parsedUrl.search,
          headers: {
            "User-Agent": "PremiereProAssetFinder/2.0 (admin@antigravity.com; +https://github.com/antigravity/assetfinder)"
          }
        };

        https.get(options, (res) => {
          if (res.statusCode !== 200) {
            resolve("");
            return;
          }

          const chunks = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () => {
            const buffer = Buffer.concat(chunks);
            const mimeType = res.headers["content-type"] || "image/jpeg";
            const base64 = buffer.toString("base64");
            resolve(`data:${mimeType};base64,${base64}`);
          });
        }).on("error", () => {
          resolve("");
        });
      } catch (e) {
        resolve("");
      }
    });
  }

  /**
   * Search for videos on Wikimedia Commons (sequential to avoid request spikes)
   */
  async searchVideos(query, options = {}) {
    const page = options.page || 1;
    const perPage = options.perPage || window.Constants.DEFAULT_PAGE_SIZE;
    const offset = (page - 1) * perPage;

    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=filetype:video+${encodeURIComponent(query)}&gsrnamespace=6&prop=imageinfo&iiprop=url|mime|mediatype|thumbwidth|thumbheight&iiurlwidth=320&format=json&gsrlimit=${perPage}&gsroffset=${offset}`;

    window.Logger.debug(`WikimediaProvider: Searching with URL: ${url}`);

    try {
      const response = await fetch(url, { method: "GET" });

      if (!response.ok) {
        throw new Error(`Wikimedia API responded with status ${response.status}`);
      }

      const data = await response.json();

      if (!data.query || !data.query.pages) {
        return {
          assets: [],
          total: 0,
          page: page,
          hasMore: false
        };
      }

      const pages = Object.values(data.query.pages);
      const assets = [];

      // Loop sequentially to avoid parallel Varnish connection rate-limiting (429)
      for (const p of pages) {
        if (p.imageinfo && p.imageinfo[0] && p.imageinfo[0].mediatype === "VIDEO") {
          const asset = this.normalizeAsset(p, window.Constants.ASSET_TYPES.VIDEO);
          if (p.imageinfo[0].thumburl) {
            const base64Thumb = await this.fetchImageAsBase64(p.imageinfo[0].thumburl);
            if (base64Thumb) {
              asset.thumbnailUrl = base64Thumb;
            }
          }
          assets.push(asset);
        }
      }

      return {
        assets,
        total: (offset + assets.length + (assets.length === perPage ? perPage : 0)), // Estimated total
        page: page,
        hasMore: assets.length === perPage
      };
    } catch (err) {
      window.Logger.error("WikimediaProvider: Search videos failed", err);
      throw err;
    }
  }

  /**
   * Search for images (Wikimedia Commons has images too, run sequentially)
   */
  async searchImages(query, options = {}) {
    const page = options.page || 1;
    const perPage = options.perPage || window.Constants.DEFAULT_PAGE_SIZE;
    const offset = (page - 1) * perPage;

    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=filetype:bitmap+${encodeURIComponent(query)}&gsrnamespace=6&prop=imageinfo&iiprop=url|mime|mediatype|thumbwidth|thumbheight&iiurlwidth=320&format=json&gsrlimit=${perPage}&gsroffset=${offset}`;

    try {
      const response = await fetch(url, { method: "GET" });
      if (!response.ok) throw new Error(`Wikimedia API error: ${response.status}`);
      const data = await response.json();

      if (!data.query || !data.query.pages) {
        return { assets: [], total: 0, page, hasMore: false };
      }

      const pages = Object.values(data.query.pages);
      const assets = [];

      // Loop sequentially to avoid parallel connection blocks (429)
      for (const p of pages) {
        if (p.imageinfo && p.imageinfo[0] && p.imageinfo[0].mediatype === "BITMAP") {
          const asset = this.normalizeAsset(p, window.Constants.ASSET_TYPES.IMAGE);
          if (p.imageinfo[0].thumburl) {
            const base64Thumb = await this.fetchImageAsBase64(p.imageinfo[0].thumburl);
            if (base64Thumb) {
              asset.thumbnailUrl = base64Thumb;
            }
          }
          assets.push(asset);
        }
      }

      return {
        assets,
        total: (offset + assets.length + (assets.length === perPage ? perPage : 0)),
        page: page,
        hasMore: assets.length === perPage
      };
    } catch (err) {
      window.Logger.error("WikimediaProvider: Search images failed", err);
      throw err;
    }
  }

  /**
   * Normalize Wikimedia API page format to Unified Asset model
   */
  normalizeAsset(rawAsset, type) {
    const info = rawAsset.imageinfo[0];
    const pageId = rawAsset.pageid;
    const cleanTitle = rawAsset.title.replace(/^File:/, "");
    
    // Normalize clean URL
    let videoUrl = info.url;
    if (videoUrl.includes("?")) {
      videoUrl = videoUrl.split("?")[0];
    }

    const downloadOptions = [
      {
        quality: "Original Quality",
        width: info.thumbwidth || 1920,
        height: info.thumbheight || 1080,
        mimeType: info.mime,
        url: videoUrl
      }
    ];

    return {
      id: `${this.id}:${pageId}`,
      provider: this.id,
      providerAssetId: pageId.toString(),
      type: type,
      title: cleanTitle,
      creator: "Wikimedia Contributor",
      creatorUrl: info.descriptionurl || "",
      thumbnailUrl: info.thumburl || "", // Initial URL fallback
      previewUrl: type === window.Constants.ASSET_TYPES.VIDEO ? `http://127.0.0.1:8089/?url=${encodeURIComponent(videoUrl)}` : "",
      duration: 0,
      width: info.thumbwidth || 0,
      height: info.thumbheight || 0,
      downloadOptions,
      license: "Creative Commons / Public Domain",
      attribution: `Asset from Wikimedia Commons [${info.descriptionurl || ""}]`
    };
  }
}

// Instantiate and register globally
window.WikimediaProvider = new WikimediaProvider();
if (typeof module !== "undefined") {
  module.exports = window.WikimediaProvider;
}
