/** Nguồn YouTube không cần API key; metadata được lấy qua bridge yt-dlp. */
class YouTubeProvider extends window.ProviderBase {
  constructor() { super(window.Constants.PROVIDERS.YOUTUBE, "YouTube"); this.connected = true; }
  async testConnection() { return Boolean(await window.DownloadManager.checkBridge()); }
  async searchImages() { return { assets: [], hasMore: false }; }
  normalize(info) {
    const videoId = info.id;
    const watchUrl = info.webpage_url || `https://www.youtube.com/watch?v=${videoId}`;
    const options = [
      ["Chất lượng tốt nhất", info.width || 1920, info.height || 1080, "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]"],
      ["Full HD 1080p", 1920, 1080, "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080][ext=mp4]"],
      ["HD 720p", 1280, 720, "bv*[height<=720][ext=mp4]+ba[ext=m4a]/b[height<=720][ext=mp4]"]
    ].map(([quality, width, height, formatCode]) => ({ quality, width, height, mimeType: "video/mp4", url: watchUrl, formatCode }));
    return {
      id: `${this.id}:${videoId}`, provider: this.id, providerAssetId: videoId,
      type: window.Constants.ASSET_TYPES.VIDEO, title: info.title || "Video YouTube",
      creator: info.uploader || info.channel || "Không rõ", creatorUrl: info.uploader_url || info.channel_url || "",
      thumbnailUrl: info.thumbnail || "", previewUrl: info.url || "", duration: info.duration || 0,
      width: info.width || 0, height: info.height || 0, downloadOptions: options,
      license: info.license || "YouTube", attribution: `YouTube: ${watchUrl}`
    };
  }
  async searchVideos(query, options = {}) {
    const page = options.page || 1, perPage = options.perPage || window.Constants.DEFAULT_PAGE_SIZE;
    const items = await window.DownloadManager.searchYoutube(query, page * perPage);
    const start = (page - 1) * perPage;
    return { assets: items.slice(start, start + perPage).map(item => this.normalize(item)), hasMore: items.length >= page * perPage };
  }
}
window.YouTubeProvider = new YouTubeProvider();
