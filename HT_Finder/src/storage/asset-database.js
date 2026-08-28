/** Lịch sử B-roll gọn nhẹ cho UXP; không phụ thuộc Node fs. */
class AssetDatabase {
  constructor() { this.key = "htFinder.assets.v2"; this.cache = { assets: [] }; }
  async init() {
    try { this.cache = JSON.parse(localStorage.getItem(this.key) || '{"assets":[]}'); }
    catch (_) { this.cache = { assets: [] }; }
    if (!Array.isArray(this.cache.assets)) this.cache.assets = [];
  }
  persist() { localStorage.setItem(this.key, JSON.stringify(this.cache)); }
  getAsset(provider, providerAssetId, quality) {
    return this.cache.assets.find(item => item.provider === provider && String(item.providerAssetId) === String(providerAssetId) && item.quality === quality) || null;
  }
  async saveAsset(metadata) {
    this.cache.assets = this.cache.assets.filter(item => !(item.provider === metadata.provider && String(item.providerAssetId) === String(metadata.providerAssetId) && item.quality === metadata.quality));
    this.cache.assets.push({ ...metadata, downloadedAt: new Date().toISOString() });
    this.persist();
  }
  removeAssetEntry(record) { this.cache.assets = this.cache.assets.filter(item => item !== record); this.persist(); }
}
window.AssetDatabase = new AssetDatabase();
