/**
 * Asset Finder - Constants
 */

const Constants = {
  PROVIDERS: {
    PEXELS: "pexels",
    PIXABAY: "pixabay",
    YOUTUBE: "youtube",
    WIKIMEDIA: "wikimedia"
  },
  
  ASSET_TYPES: {
    VIDEO: "video",
    IMAGE: "image"
  },

  RESOLUTIONS: {
    ALL: "all",
    HD: "hd",
    FULLHD: "fullhd",
    "4K": "4k"
  },

  STORAGE_KEYS: {
    PEXELS_KEY: "pexels-api-key",
    PIXABAY_KEY: "pixabay-api-key",
    YOUTUBE_KEY: "youtube-api-key",
    DOWNLOAD_DIR: "assetfinder-download-dir"
  },

  DEFAULT_BIN: "02_B-ROLL",
  
  DEFAULT_PAGE_SIZE: 15
};

window.Constants = Constants;
if (typeof module !== "undefined") {
  module.exports = Constants;
}
