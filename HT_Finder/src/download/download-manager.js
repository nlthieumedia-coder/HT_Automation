/** Tiến trình tải cho UXP qua bridge localhost, theo mô hình HT_Automation. */
class DownloadManager {
  constructor() { this.baseUrl = "http://127.0.0.1:19889"; this.available = false; }
  async request(route, payload, timeoutMs = 900000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl}${route}`, { method: payload ? "POST" : "GET", headers: payload ? { "Content-Type": "application/json" } : undefined, body: payload ? JSON.stringify(payload) : undefined, signal: controller.signal });
      const text = await response.text();
      let data; try { data = text ? JSON.parse(text) : {}; } catch (_) { throw new Error(text || `HTTP ${response.status}`); }
      if (!response.ok || data.success === false) throw new Error(data.error || `Bridge HTTP ${response.status}`);
      return data;
    } finally { clearTimeout(timer); }
  }
  async checkBridge() { try { const value = await this.request("/health", null, 3000); this.available = true; return value; } catch (error) { this.available = false; window.Logger.warn("Bridge tải B-roll chưa chạy.", error); return null; } }
  async ensureYtdlp() { const health = await this.checkBridge(); if (!health) throw new Error("Bridge tải B-roll chưa chạy. Hãy chạy cong_cu\\phat_trien\\CHAY_BRIDGE.bat."); return health.ytdlpPath || "yt-dlp"; }
  async searchYoutube(query, count) { await this.ensureYtdlp(); return (await this.request("/youtube-search", { query, count }, 120000)).items || []; }
  async extractUrl(url) { await this.ensureYtdlp(); return (await this.request("/extract", { url }, 120000)).item; }
  async download(asset, option, progressCallback, overwritePath = null) {
    const baseDir = window.SettingsView.getDownloadFolder();
    if (!baseDir && !overwritePath) throw new Error("Hãy chọn thư mục lưu B-roll trong Cài đặt.");
    if (progressCallback) progressCallback(5);
    const result = await this.request("/download", { asset: { provider: asset.provider, providerAssetId: asset.providerAssetId, title: asset.title, type: asset.type }, option, baseDir, overwritePath });
    if (progressCallback) progressCallback(100);
    return { localPath: result.localPath, abort() {} };
  }
}
window.DownloadManager = new DownloadManager();
