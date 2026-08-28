/**
 * Asset Finder - Asset Detail Drawer Controller
 */

class AssetDetail {
  constructor() {
    this.drawer = null;
    this.closeBtn = null;
    
    this.title = null;
    this.mediaContainer = null;
    
    this.providerLabel = null;
    this.creatorLabel = null;
    this.durationLabel = null;
    this.resolutionLabel = null;
    this.licenseLabel = null;
    
    this.qualitySelect = null;
    this.binSelect = null;
    this.binCustomInput = null;
    this.toggleBinTypeBtn = null;
    
    this.addToProjectBtn = null;
    
    this.statusContainer = null;
    this.statusText = null;
    this.progressBarFill = null;
    this.cancelBtn = null;
    
    this.currentAsset = null;
    this.currentDownload = null; // Holds reference to current XHR request for cancellation
  }

  /**
   * Bind event listeners and cache DOM elements
   */
  init() {
    window.Logger.debug("AssetDetail: Initializing UI bindings...");

    this.drawer = document.getElementById("asset-detail-drawer");
    this.closeBtn = document.getElementById("btn-close-detail");
    
    this.title = document.getElementById("detail-title");
    this.mediaContainer = document.getElementById("detail-media-container");
    
    this.providerLabel = document.getElementById("detail-provider");
    this.creatorLabel = document.getElementById("detail-creator");
    this.durationLabel = document.getElementById("detail-duration");
    this.resolutionLabel = document.getElementById("detail-resolution");
    this.licenseLabel = document.getElementById("detail-license");
    
    this.qualitySelect = document.getElementById("detail-quality-select");
    this.binSelect = document.getElementById("detail-bin-select");
    this.binCustomInput = document.getElementById("detail-bin-custom");
    this.toggleBinTypeBtn = document.getElementById("btn-toggle-bin-type");
    
    this.addToProjectBtn = document.getElementById("btn-add-to-project");
    
    this.statusContainer = document.getElementById("pipeline-status-container");
    this.statusText = document.getElementById("pipeline-status-text");
    this.progressBarFill = document.getElementById("pipeline-progress-bar");
    this.cancelBtn = document.getElementById("pipeline-cancel-btn");

    // Close drawer binding
    if (this.closeBtn) {
      this.closeBtn.addEventListener("click", () => this.close());
    }

    // Toggle custom bin field
    if (this.toggleBinTypeBtn) {
      this.toggleBinTypeBtn.addEventListener("click", () => this.toggleBinInputMode());
    }

    // "Add to Project" pipeline hook
    if (this.addToProjectBtn) {
      this.addToProjectBtn.addEventListener("click", () => this.startImportPipeline());
    }

    // Cancel download listener
    if (this.cancelBtn) {
      this.cancelBtn.addEventListener("click", () => this.cancelPipeline());
    }

    // Wire up duplicate dialog buttons
    this.setupDuplicateModal();
  }

  /**
   * Open the detailed view for a selected asset
   * @param {NormalizedAsset} asset 
   */
  async open(asset) {
    this.currentAsset = asset;
    window.Logger.info(`AssetDetail: Opening detailed drawer for: ${asset.id}`);

    // Reset pipeline UI states
    this.statusContainer.classList.add("hidden");
    this.progressBarFill.style.width = "0%";
    this.addToProjectBtn.disabled = false;
    this.addToProjectBtn.textContent = "THÊM B-ROLL VÀO PROJECT";
    this.addToProjectBtn.className = "btn-primary btn-large";

    // Set Text labels
    this.title.textContent = asset.title;
    this.providerLabel.textContent = asset.provider.toUpperCase();
    this.creatorLabel.textContent = asset.creator;
    this.durationLabel.textContent = asset.type === window.Constants.ASSET_TYPES.VIDEO ? 
      window.Helpers.formatDuration(asset.duration) : "Ảnh tĩnh";
    this.resolutionLabel.textContent = `${asset.width}x${asset.height}`;
    this.licenseLabel.textContent = asset.license;

    // Load Preview media player
    this.loadPreview();

    // Populate qualities list
    this.qualitySelect.innerHTML = "";
    asset.downloadOptions.forEach((opt, idx) => {
      const option = document.createElement("option");
      option.value = idx.toString();
      option.textContent = opt.quality;
      this.qualitySelect.appendChild(option);
    });

    // Populate project bins list
    await this.refreshBinsDropdown();

    // Slide in drawer
    this.drawer.classList.add("active");
  }

  /**
   * Close drawer and stop players
   */
  close() {
    window.Logger.debug("AssetDetail: Closing detailed drawer.");
    
    // Stop and clear video players to release resources
    const video = this.mediaContainer.querySelector("video");
    if (video) {
      video.pause();
      video.src = "";
      video.load();
    }
    
    this.mediaContainer.innerHTML = "";
    this.drawer.classList.remove("active");
    this.currentAsset = null;
    
    // In case there is an active request, cancel it
    this.cancelPipeline();
  }

  /**
   * Inject preview loop player
   */
  loadPreview() {
    this.mediaContainer.innerHTML = "";
    
    if (this.currentAsset.type === window.Constants.ASSET_TYPES.VIDEO) {
      if (this.currentAsset.previewUrl) {
        const video = document.createElement("video");
        video.src = this.currentAsset.previewUrl;
        video.autoplay = true;
        video.muted = true;
        video.loop = true;
        video.controls = true;
        video.playsInline = true;
        this.mediaContainer.appendChild(video);
      } else {
        this.mediaContainer.innerHTML = `<img src="${this.currentAsset.thumbnailUrl}" style="width:100%; height:100%; object-fit:contain;">`;
      }
    } else {
      const img = document.createElement("img");
      img.src = this.currentAsset.previewUrl || this.currentAsset.thumbnailUrl;
      this.mediaContainer.appendChild(img);
    }
  }

  /**
   * Toggle custom bin input text row
   */
  toggleBinInputMode() {
    if (this.binSelect.classList.contains("hidden")) {
      // Show dropdown
      this.binSelect.classList.remove("hidden");
      this.binCustomInput.classList.add("hidden");
      this.toggleBinTypeBtn.textContent = "📝";
    } else {
      // Show custom input
      this.binSelect.classList.add("hidden");
      this.binCustomInput.classList.remove("hidden");
      this.binCustomInput.focus();
      this.toggleBinTypeBtn.textContent = "📋";
    }
  }

  /**
   * Retrieve list of bins dynamically from Premiere Pro project
   */
  async refreshBinsDropdown() {
    this.binSelect.innerHTML = "";
    
    // Add default recommendations
    const defaults = ["02_B-ROLL", "01_FOOTAGE", "STOCK"];
    defaults.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d;
      this.binSelect.appendChild(opt);
    });

    // Append Project Root option
    const rootOpt = document.createElement("option");
    rootOpt.value = "Root";
    rootOpt.textContent = "[Gốc Project]";
    this.binSelect.appendChild(rootOpt);

    // milestone 6: Connect to PremiereManager.getProjectBins()
    try {
      if (window.PremiereManager && typeof window.PremiereManager.getProjectBins === "function") {
        const projectBins = await window.PremiereManager.getProjectBins();
        
        projectBins.forEach(binName => {
          // Prevent duplicates in dropdown
          if (!defaults.includes(binName) && binName !== "Root") {
            const opt = document.createElement("option");
            opt.value = binName;
            opt.textContent = binName;
            this.binSelect.appendChild(opt);
          }
        });
      }
    } catch (err) {
      window.Logger.warn("AssetDetail: Failed to query bins from Premiere project.", err);
    }
  }

  /**
   * Run the Download and Import process
   */
  async startImportPipeline() {
    if (!this.currentAsset) return;

    // 1. Resolve Premiere Pro project status before proceeding
    let isProjectAvailable = false;
    try {
      if (window.PremiereManager && typeof window.PremiereManager.verifyActiveProject === "function") {
        isProjectAvailable = await window.PremiereManager.verifyActiveProject();
      } else {
        // Mock fallback during browser tests
        isProjectAvailable = true;
      }
    } catch (e) {
      window.Logger.error("AssetDetail: Project validation failed", e);
    }

    if (!isProjectAvailable) {
      alert("Error: No Premiere Pro project is currently open. Please open a project first.");
      return;
    }

    // Disable add button
    this.addToProjectBtn.disabled = true;
    this.addToProjectBtn.textContent = "PROCESSING...";

    // Resolve details
    const selectedIdx = parseInt(this.qualitySelect.value);
    const option = this.currentAsset.downloadOptions[selectedIdx];
    
    const binName = this.binSelect.classList.contains("hidden") ? 
      this.binCustomInput.value.trim() : this.binSelect.value;
      
    const targetBin = binName || window.Constants.DEFAULT_BIN;

    // Show Progress indicator
    this.statusContainer.classList.remove("hidden");
    this.statusText.textContent = "Checking asset history...";
    this.progressBarFill.style.width = "0%";

    // 2. Check for duplicate downloads
    let duplicateRecord = null;
    try {
      if (window.AssetDatabase && typeof window.AssetDatabase.getAsset === "function") {
        duplicateRecord = await window.AssetDatabase.getAsset(
          this.currentAsset.provider,
          this.currentAsset.providerAssetId,
          option.quality
        );
      }
    } catch (err) {
      window.Logger.warn("AssetDetail: Duplicate checking exception", err);
    }

    if (duplicateRecord) {
      window.Logger.info(`AssetDetail: Duplicate found at: ${duplicateRecord.localPath}`);
      this.showDuplicatePopup(duplicateRecord, option, targetBin);
      return;
    }

    // 3. Initiate fresh download
    await this.executeDownloadAndImport(option, targetBin);
  }

  /**
   * Triggers download stream and import commands
   */
  async executeDownloadAndImport(option, targetBin, overwritePath = null) {
    this.statusText.textContent = "Đang chuẩn bị tải...";
    this.progressBarFill.style.width = "0%";
    this.cancelBtn.classList.remove("hidden");

    try {
      if (!window.DownloadManager || typeof window.DownloadManager.download !== "function") {
        throw new Error("DownloadManager engine is not loaded.");
      }

      // Execute Download
      this.currentDownload = await window.DownloadManager.download(
        this.currentAsset,
        option,
        (progressPercent) => {
          this.progressBarFill.style.width = `${progressPercent}%`;
          this.statusText.textContent = `Đang tải ${Math.round(progressPercent)}%`;
        },
        overwritePath
      );

      const localPath = this.currentDownload.localPath;
      
      // Update pipeline display
      this.statusText.textContent = "Đang thêm B-roll vào Premiere...";
      this.progressBarFill.style.width = "100%";
      this.cancelBtn.classList.add("hidden"); // Can no longer cancel once import starts

      // Execute Premiere Import
      let importSuccess = false;
      if (window.PremiereManager && typeof window.PremiereManager.importAsset === "function") {
        importSuccess = await window.PremiereManager.importAsset(localPath, targetBin);
      } else {
        // Mock success for development standalone
        importSuccess = true;
        window.Logger.info(`Mock Import success for ${localPath} into Bin "${targetBin}"`);
      }

      if (!importSuccess) {
        throw new Error("Premiere Pro failed to import the file.");
      }

      // Save metadata logging
      if (window.AssetDatabase && typeof window.AssetDatabase.saveAsset === "function") {
        await window.AssetDatabase.saveAsset({
          provider: this.currentAsset.provider,
          providerAssetId: this.currentAsset.providerAssetId,
          creator: this.currentAsset.creator,
          sourceUrl: this.currentAsset.previewUrl || option.url,
          license: this.currentAsset.license,
          localPath: localPath,
          quality: option.quality,
          width: option.width,
          height: option.height
        });
      }

      // Pipeline Complete UI state
      this.statusText.textContent = "Đã thêm vào Project ✓";
      this.addToProjectBtn.textContent = "ĐÃ THÊM ✓";
      this.addToProjectBtn.className = "btn-primary btn-large status-badge connected";
      
    } catch (err) {
      window.Logger.error("AssetDetail: Pipeline failure", err);
      this.statusText.textContent = `Lỗi: ${err.message || "Không xác định"}`;
      this.addToProjectBtn.disabled = false;
      this.addToProjectBtn.textContent = "THỬ LẠI";
    } finally {
      this.currentDownload = null;
      this.cancelBtn.classList.add("hidden");
    }
  }

  /**
   * Cancel active network download request
   */
  cancelPipeline() {
    if (this.currentDownload && typeof this.currentDownload.abort === "function") {
      window.Logger.info("AssetDetail: Cancelling download pipeline...");
      this.currentDownload.abort();
      
      this.statusText.textContent = "Download cancelled";
      this.progressBarFill.style.width = "0%";
      this.addToProjectBtn.disabled = false;
      this.addToProjectBtn.textContent = "THÊM B-ROLL VÀO PROJECT";
      this.cancelBtn.classList.add("hidden");
      this.currentDownload = null;
    }
  }

  // --- Duplicate Modal Dialog Handlers ---

  setupDuplicateModal() {
    this.dupModal = document.getElementById("duplicate-modal");
    this.dupModalText = document.getElementById("duplicate-modal-text");
    this.dupImportBtn = document.getElementById("btn-dup-import");
    this.dupRedownloadBtn = document.getElementById("btn-dup-redownload");
    this.dupCancelBtn = document.getElementById("btn-dup-cancel");

    this.dupPendingData = null; // Store context while prompt is open

    // Bind click events
    if (this.dupImportBtn) {
      this.dupImportBtn.addEventListener("click", () => this.resolveDuplicateImport());
    }
    if (this.dupRedownloadBtn) {
      this.dupRedownloadBtn.addEventListener("click", () => this.resolveDuplicateRedownload());
    }
    if (this.dupCancelBtn) {
      this.dupCancelBtn.addEventListener("click", () => {
        this.hideDuplicatePopup();
        this.addToProjectBtn.disabled = false;
        this.addToProjectBtn.textContent = "THÊM B-ROLL VÀO PROJECT";
        this.statusContainer.classList.add("hidden");
      });
    }
  }

  showDuplicatePopup(record, option, targetBin) {
    this.dupPendingData = { record, option, targetBin };
    this.dupModalText.innerHTML = `
      File already exists at:<br>
      <span style="font-size:10px; color:var(--text-secondary); word-break:break-all;">${record.localPath}</span>
    `;
    this.dupModal.classList.remove("hidden");
  }

  hideDuplicatePopup() {
    this.dupModal.classList.add("hidden");
    this.dupPendingData = null;
  }

  async resolveDuplicateImport() {
    if (!this.dupPendingData) return;
    const { record, targetBin } = this.dupPendingData;
    this.hideDuplicatePopup();

    this.statusText.textContent = "Đang thêm file đã tải...";
    this.progressBarFill.style.width = "100%";
    this.cancelBtn.classList.add("hidden");

    try {
      let importSuccess = false;
      if (window.PremiereManager && typeof window.PremiereManager.importAsset === "function") {
        importSuccess = await window.PremiereManager.importAsset(record.localPath, targetBin);
      } else {
        importSuccess = true;
      }

      if (!importSuccess) {
        throw new Error("Premiere Pro failed to import the existing file.");
      }

      // Success
      this.statusText.textContent = "Đã thêm vào Project ✓";
      this.addToProjectBtn.textContent = "ADDED ✓";
      this.addToProjectBtn.className = "btn-primary btn-large status-badge connected";
    } catch (err) {
      window.Logger.error("AssetDetail: Duplicate import failed", err);
      this.statusText.textContent = `Không thể thêm: ${err.message}`;
      this.addToProjectBtn.disabled = false;
      this.addToProjectBtn.textContent = "THỬ LẠI";
    }
  }

  async resolveDuplicateRedownload() {
    if (!this.dupPendingData) return;
    const { record, option, targetBin } = this.dupPendingData;
    this.hideDuplicatePopup();

    // Re-run execution, passing the existing path to overwrite the file
    await this.executeDownloadAndImport(option, targetBin, record.localPath);
  }
}

// Instantiate and expose globally
window.AssetDetail = new AssetDetail();
if (typeof module !== "undefined") {
  module.exports = window.AssetDetail;
}
