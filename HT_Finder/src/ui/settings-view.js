/**
 * HT_Finder - Trình điều khiển cài đặt UXP
 */

class SettingsView {
  constructor() {
    this.pexelsKeyInput = null;
    this.pexelsStatusBadge = null;
    this.pexelsSaveBtn = null;
    
    this.pixabayKeyInput = null;
    this.pixabayStatusBadge = null;
    this.pixabaySaveBtn = null;

    this.youtubeKeyInput = null;
    this.youtubeStatusBadge = null;
    this.youtubeSaveBtn = null;
    
    this.dirDisplay = null;
    this.dirSelectBtn = null;
    
    this.downloadFolder = null; // Stored path string
  }

  /**
   * Bind event listeners and load stored configurations
   */
  async init() {
    window.Logger.debug("SettingsView: Initializing UI bindings...");
    
    // Cache DOM Elements
    this.pexelsKeyInput = document.getElementById("pexels-api-key");
    this.pexelsStatusBadge = document.getElementById("pexels-status");
    this.pexelsSaveBtn = document.getElementById("btn-save-pexels");

    this.pixabayKeyInput = document.getElementById("pixabay-api-key");
    this.pixabayStatusBadge = document.getElementById("pixabay-status");
    this.pixabaySaveBtn = document.getElementById("btn-save-pixabay");

    this.youtubeKeyInput = document.getElementById("youtube-api-key");
    this.youtubeStatusBadge = document.getElementById("youtube-status");
    this.youtubeSaveBtn = document.getElementById("btn-save-youtube");

    this.dirDisplay = document.getElementById("selected-dir-display");
    this.dirSelectBtn = document.getElementById("btn-select-dir");

    // Bind Credentials buttons
    if (this.pexelsSaveBtn) {
      this.pexelsSaveBtn.addEventListener("click", () => this.togglePexelsConnection());
    }
    if (this.pixabaySaveBtn) {
      this.pixabaySaveBtn.addEventListener("click", () => this.togglePixabayConnection());
    }
    if (this.youtubeSaveBtn) {
      this.youtubeSaveBtn.addEventListener("click", () => this.toggleYoutubeConnection());
    }
    
    // Bind Directory button
    if (this.dirSelectBtn) {
      this.dirSelectBtn.addEventListener("click", () => this.selectDownloadDirectory());
    }

    // Load initial states from storage
    await this.loadCredentialsState();
    await this.loadDirectoryState();
  }

  /**
   * Check secure storage and update UI connection status for Pexels and Pixabay
   */
  async loadCredentialsState() {
    // 1. Pexels Key
    const pexelsKey = await window.CredentialManager.getPexelsKey();
    if (pexelsKey) {
      this.setPexelsConnected(true);
    } else {
      this.setPexelsConnected(false);
    }

    // 2. Pixabay Key
    const pixabayKey = await window.CredentialManager.getPixabayKey();
    if (pixabayKey) {
      this.setPixabayConnected(true);
    } else {
      this.setPixabayConnected(false);
    }

    // 3. YouTube Key
    const youtubeKey = await window.CredentialManager.getYoutubeKey();
    if (youtubeKey) {
      this.setYoutubeConnected(true);
    } else {
      this.setYoutubeConnected(false);
    }
  }

  /**
   * Connect or disconnect Pexels provider
   */
  async togglePexelsConnection() {
    const isConnected = this.pexelsStatusBadge.classList.contains("connected");
    
    if (isConnected) {
      // Disconnect action
      window.Logger.info("SettingsView: Disconnecting Pexels...");
      await window.CredentialManager.deletePexelsKey();
      this.setPexelsConnected(false);
      
      if (window.ProviderManager) {
        window.ProviderManager.disconnectProvider(window.Constants.PROVIDERS.PEXELS);
      }
    } else {
      // Connect action
      const keyVal = this.pexelsKeyInput.value.trim();
      if (!keyVal) {
        alert("Please enter a valid Pexels API Key.");
        return;
      }
      
      this.pexelsSaveBtn.disabled = true;
      this.pexelsSaveBtn.textContent = "Connecting...";

      const isValid = await this.validateKey(window.Constants.PROVIDERS.PEXELS, keyVal);
      if (isValid) {
        await window.CredentialManager.setPexelsKey(keyVal);
        this.setPexelsConnected(true);
        if (window.ProviderManager) {
          window.ProviderManager.connectProvider(window.Constants.PROVIDERS.PEXELS, keyVal);
        }
        window.Logger.info("SettingsView: Successfully saved Pexels API Key.");
      } else {
        alert("Connection Failed: The Pexels API Key is invalid.");
        this.pexelsSaveBtn.disabled = false;
        this.pexelsSaveBtn.textContent = "Connect";
      }
    }
  }

  /**
   * Connect or disconnect Pixabay provider
   */
  async togglePixabayConnection() {
    const isConnected = this.pixabayStatusBadge.classList.contains("connected");
    
    if (isConnected) {
      // Disconnect action
      window.Logger.info("SettingsView: Disconnecting Pixabay...");
      await window.CredentialManager.deletePixabayKey();
      this.setPixabayConnected(false);
      
      if (window.ProviderManager) {
        window.ProviderManager.disconnectProvider(window.Constants.PROVIDERS.PIXABAY);
      }
    } else {
      // Connect action
      const keyVal = this.pixabayKeyInput.value.trim();
      if (!keyVal) {
        alert("Please enter a valid Pixabay API Key.");
        return;
      }

      this.pixabaySaveBtn.disabled = true;
      this.pixabaySaveBtn.textContent = "Connecting...";

      const isValid = await this.validateKey(window.Constants.PROVIDERS.PIXABAY, keyVal);
      if (isValid) {
        await window.CredentialManager.setPixabayKey(keyVal);
        this.setPixabayConnected(true);
        if (window.ProviderManager) {
          window.ProviderManager.connectProvider(window.Constants.PROVIDERS.PIXABAY, keyVal);
        }
        window.Logger.info("SettingsView: Successfully saved Pixabay API Key.");
      } else {
        alert("Connection Failed: The Pixabay API Key is invalid.");
        this.pixabaySaveBtn.disabled = false;
        this.pixabaySaveBtn.textContent = "Connect";
      }
    }
  }

  /**
   * Basic key length validator
   */
  async validateKey(provider, apiKey) {
    if (apiKey.length < 10) return false;
    
    try {
      if (window.ProviderManager && window.ProviderManager.hasProvider(provider)) {
        const prov = window.ProviderManager.getProvider(provider);
        return await prov.testConnection(apiKey);
      }
    } catch (e) {
      window.Logger.error(`Validation exception for ${provider}`, e);
      return false;
    }
    
    return true;
  }

  setPexelsConnected(connected) {
    if (connected) {
      this.pexelsStatusBadge.textContent = "Connected";
      this.pexelsStatusBadge.className = "status-badge connected";
      this.pexelsKeyInput.value = "••••••••••••••••••••••••••••••••";
      this.pexelsKeyInput.disabled = true;
      this.pexelsSaveBtn.textContent = "Disconnect";
      this.pexelsSaveBtn.className = "btn-secondary";
      this.pexelsSaveBtn.disabled = false;
    } else {
      this.pexelsStatusBadge.textContent = "Disconnected";
      this.pexelsStatusBadge.className = "status-badge disconnected";
      this.pexelsKeyInput.value = "";
      this.pexelsKeyInput.disabled = false;
      this.pexelsSaveBtn.textContent = "Connect";
      this.pexelsSaveBtn.className = "btn-primary";
      this.pexelsSaveBtn.disabled = false;
    }
  }

  setPixabayConnected(connected) {
    if (connected) {
      this.pixabayStatusBadge.textContent = "Connected";
      this.pixabayStatusBadge.className = "status-badge connected";
      this.pixabayKeyInput.value = "••••••••••••••••••••••••••••••••";
      this.pixabayKeyInput.disabled = true;
      this.pixabaySaveBtn.textContent = "Disconnect";
      this.pixabaySaveBtn.className = "btn-secondary";
      this.pixabaySaveBtn.disabled = false;
    } else {
      this.pixabayStatusBadge.textContent = "Disconnected";
      this.pixabayStatusBadge.className = "status-badge disconnected";
      this.pixabayKeyInput.value = "";
      this.pixabayKeyInput.disabled = false;
      this.pixabaySaveBtn.textContent = "Connect";
      this.pixabaySaveBtn.className = "btn-primary";
      this.pixabaySaveBtn.disabled = false;
    }
  }

  /**
   * Connect or disconnect YouTube provider
   */
  async toggleYoutubeConnection() {
    const isConnected = this.youtubeStatusBadge.classList.contains("connected");
    
    if (isConnected) {
      // Disconnect action
      window.Logger.info("SettingsView: Disconnecting YouTube...");
      await window.CredentialManager.deleteYoutubeKey();
      this.setYoutubeConnected(false);
      
      if (window.ProviderManager) {
        window.ProviderManager.disconnectProvider(window.Constants.PROVIDERS.YOUTUBE);
      }
    } else {
      // Connect action
      const keyVal = this.youtubeKeyInput.value.trim();
      if (!keyVal) {
        alert("Please enter a valid YouTube API Key.");
        return;
      }

      this.youtubeSaveBtn.disabled = true;
      this.youtubeSaveBtn.textContent = "Connecting...";

      const isValid = await this.validateKey(window.Constants.PROVIDERS.YOUTUBE, keyVal);
      if (isValid) {
        await window.CredentialManager.setYoutubeKey(keyVal);
        this.setYoutubeConnected(true);
        if (window.ProviderManager) {
          window.ProviderManager.connectProvider(window.Constants.PROVIDERS.YOUTUBE, keyVal);
        }
        window.Logger.info("SettingsView: Successfully saved YouTube API Key.");
      } else {
        alert("Connection Failed: The YouTube API Key is invalid or quota exceeded.");
        this.youtubeSaveBtn.disabled = false;
        this.youtubeSaveBtn.textContent = "Connect";
      }
    }
  }

  setYoutubeConnected(connected) {
    if (connected) {
      this.youtubeStatusBadge.textContent = "Connected";
      this.youtubeStatusBadge.className = "status-badge connected";
      this.youtubeKeyInput.value = "••••••••••••••••••••••••••••••••";
      this.youtubeKeyInput.disabled = true;
      this.youtubeSaveBtn.textContent = "Disconnect";
      this.youtubeSaveBtn.className = "btn-secondary";
      this.youtubeSaveBtn.disabled = false;
    } else {
      this.youtubeStatusBadge.textContent = "Disconnected";
      this.youtubeStatusBadge.className = "status-badge disconnected";
      this.youtubeKeyInput.value = "";
      this.youtubeKeyInput.disabled = false;
      this.youtubeSaveBtn.textContent = "Connect";
      this.youtubeSaveBtn.className = "btn-primary";
      this.youtubeSaveBtn.disabled = false;
    }
  }

  // --- Directory Selection & Paths ---

  /**
   * Chọn thư mục tải xuống bằng UXP localFileSystem.
   */
  async selectDownloadDirectory() {
    try {
      const { storage } = require("uxp");
      const folder = await storage.localFileSystem.getFolder();
      if (!folder) return;
      const token = await storage.localFileSystem.createPersistentToken(folder);
      localStorage.setItem(window.Constants.STORAGE_KEYS.DOWNLOAD_DIR, folder.nativePath);
      localStorage.setItem(`${window.Constants.STORAGE_KEYS.DOWNLOAD_DIR}.token`, token);
      this.downloadFolder = folder.nativePath;
      this.dirDisplay.textContent = folder.nativePath;
      window.Logger.info(`Đã chọn thư mục B-roll: ${folder.nativePath}`);
    } catch (err) {
      window.Logger.error("Không chọn được thư mục B-roll", err);
      alert("Không chọn được thư mục: " + err.message);
    }
  }

  /**
   * Retrieve and restore folder path
   */
  async loadDirectoryState() {
    const storedPath = localStorage.getItem(window.Constants.STORAGE_KEYS.DOWNLOAD_DIR);
    
    if (storedPath) {
      this.downloadFolder = storedPath;
      this.dirDisplay.textContent = storedPath;
      window.Logger.debug(`SettingsView: Restored download directory path: ${storedPath}`);
    } else {
      this.dirDisplay.textContent = "Chưa chọn thư mục lưu B-roll";
      this.downloadFolder = null;
    }
  }

  /**
   * Retrieves the current download directory path string or null
   * @returns {string|null}
   */
  getDownloadFolder() {
    return this.downloadFolder;
  }
}

// Instantiate and expose globally
window.SettingsView = new SettingsView();
if (typeof module !== "undefined") {
  module.exports = window.SettingsView;
}
