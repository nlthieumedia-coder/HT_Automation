/** Bộ điều phối HT_Finder cho Premiere Pro UXP. */
async function bootstrapHTFinder() {
  const uxpState = document.getElementById("cep-status-text");
  const bridgeState = document.getElementById("bridge-status-text");
  const headerDot = document.getElementById("header-status-dot");
  try {
    require("uxp");
    if (uxpState) { uxpState.textContent = "Sẵn sàng"; uxpState.style.color = "var(--status-green)"; }
    await window.SettingsView.init();
    await window.ProviderManager.init();
    await window.AssetDatabase.init();
    window.AssetDetail.init();
    window.SearchView.init();
    const health = await window.DownloadManager.checkBridge();
    if (bridgeState) {
      bridgeState.textContent = health ? "Đã kết nối" : "Chưa chạy";
      bridgeState.style.color = health ? "var(--status-green)" : "var(--status-red)";
    }
    await window.PremiereManager.pingHost();
    if (headerDot) headerDot.className = "status-dot active";
    window.Logger.info("HT_Finder đã sẵn sàng.");
  } catch (error) {
    window.Logger.error("Không thể khởi tạo HT_Finder", error);
    if (uxpState) { uxpState.textContent = "Có lỗi"; uxpState.style.color = "var(--status-red)"; }
    if (headerDot) headerDot.className = "status-dot error";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".tab-btn").forEach(tab => tab.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(item => item.classList.toggle("active", item === tab));
    document.querySelectorAll(".view-panel").forEach(panel => panel.classList.toggle("active", panel.id === tab.dataset.target));
  }));
  document.querySelectorAll('[role="button"]').forEach(control => control.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); control.click(); }
  }));
  bootstrapHTFinder();
});

try {
  const { entrypoints } = require("uxp");
  entrypoints.setup({ panels: { htFinderPanel: { show() {}, hide() {}, destroy() {} } } });
} catch (error) { console.error("[HT_Finder] UXP entrypoint error", error); }
