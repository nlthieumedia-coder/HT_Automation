/**
 * Asset Finder - Asset Card Component
 */

class AssetCard {
  /**
   * Create and return a card DOM element for the given asset
   * @param {NormalizedAsset} asset 
   * @returns {HTMLElement}
   */
  static create(asset) {
    const card = document.createElement("div");
    card.className = "asset-card";
    card.dataset.id = asset.id;

    // Get max resolution tag
    let maxRes = "HD";
    const originalOption = asset.downloadOptions.find(o => o.width >= 3840);
    if (originalOption || asset.width >= 3840) {
      maxRes = "4K";
    } else if (asset.width >= 1920) {
      maxRes = "FHD";
    }

    // Build inner HTML structure
    const isVideo = asset.type === window.Constants.ASSET_TYPES.VIDEO;
    
    let mediaHtml = "";
    let durationHtml = "";
    
    if (isVideo) {
      mediaHtml = `
        <img src="${asset.thumbnailUrl}" class="asset-thumb" alt="${asset.title}" loading="lazy">
        ${asset.previewUrl ? `<video src="${asset.previewUrl}" class="asset-hover-video" loop muted playsinline></video>` : ""}
      `;
      durationHtml = `<span class="card-badge badge-duration">${window.Helpers.formatDuration(asset.duration)}</span>`;
    } else {
      mediaHtml = `
        <img src="${asset.thumbnailUrl}" class="asset-thumb" alt="${asset.title}" loading="lazy">
      `;
    }

    card.innerHTML = `
      <div class="asset-thumb-container">
        ${mediaHtml}
        <span class="card-badge badge-provider">${asset.provider}</span>
        ${durationHtml}
        <span class="card-badge badge-resolution">${maxRes}</span>
      </div>
    `;

    // Bind Hover preview loop for videos
    if (isVideo && asset.previewUrl) {
      const thumb = card.querySelector(".asset-thumb");
      const video = card.querySelector(".asset-hover-video");

      if (video) {
        card.addEventListener("mouseenter", () => {
          // Play loop on hover
          video.play().then(() => {
            thumb.style.opacity = "0"; // hide thumb to show video
          }).catch(err => {
            // Silence aborted play request warnings
          });
        });

        card.addEventListener("mouseleave", () => {
          // Pause and reset video
          video.pause();
          video.currentTime = 0;
          thumb.style.opacity = "1"; // show thumbnail
        });
      }
    }

    return card;
  }
}

window.AssetCard = AssetCard;
if (typeof module !== "undefined") {
  module.exports = AssetCard;
}
