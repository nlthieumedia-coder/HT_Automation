/**
 * Asset Finder - Helper Utilities
 */

const Helpers = {
  /**
   * Format duration in seconds to MM:SS format
   * @param {number} seconds 
   * @returns {string} Formatted duration (e.g., 0:45, 12:05)
   */
  formatDuration(seconds) {
    if (!seconds || isNaN(seconds) || seconds <= 0) return "0:00";
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    const paddedSeconds = remainingSeconds < 10 ? `0${remainingSeconds}` : remainingSeconds;
    return `${minutes}:${paddedSeconds}`;
  },

  /**
   * Format file sizes to human readable strings
   * @param {number} bytes 
   * @returns {string} Formatted size (e.g., 4.5 MB, 820 KB)
   */
  formatBytes(bytes) {
    if (bytes === 0 || !bytes || isNaN(bytes)) return "0 Bytes";
    
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  },

  /**
   * Generates a standardized, clean filename for stock assets
   * Format: [provider]_[id]_[width]x[height].[ext]
   * @param {string} provider 
   * @param {string} id 
   * @param {number} width 
   * @param {number} height 
   * @param {string} mimeType 
   * @returns {string} Sanitized filename
   */
  generateFilename(provider, id, width, height, mimeType) {
    const cleanProvider = provider.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanId = id.toString().replace(/[^a-z0-9]/g, "");
    
    // Guess extension based on mimeType
    let ext = "mp4";
    if (mimeType) {
      if (mimeType.includes("image/jpeg") || mimeType.includes("image/jpg")) ext = "jpg";
      else if (mimeType.includes("image/png")) ext = "png";
      else if (mimeType.includes("video/quicktime")) ext = "mov";
    }

    const resStr = (width && height) ? `${width}x${height}` : "default";
    return `${cleanProvider}_${cleanId}_${resStr}.${ext}`;
  },

  /**
   * Basic debounce implementation to prevent API flooding
   * @param {Function} func 
   * @param {number} waitMs 
   * @returns {Function}
   */
  debounce(func, waitMs) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, waitMs);
    };
  }
};

window.Helpers = Helpers;
if (typeof module !== "undefined") {
  module.exports = Helpers;
}
