/**
 * Asset Finder - Search View Controller
 */

class SearchView {
  constructor() {
    this.searchInput = null;
    this.searchBtn = null;
    
    this.sourcePexels = null;
    this.sourcePixabay = null;
    this.sourceYouTube = null;
    this.sourceWikimedia = null;
    
    this.filterType = null;
    this.filterResolution = null;
    
    this.gridContainer = null;
    this.paginationContainer = null;
    this.loadMoreBtn = null;
    
    this.currentPage = 1;
    this.isLoading = false;
  }

  /**
   * Bind event listeners and cache DOM elements
   */
  init() {
    window.Logger.debug("SearchView: Initializing Search UI...");
    
    // Cache Elements
    this.searchInput = document.getElementById("search-input");
    this.searchBtn = document.getElementById("search-button");
    
    this.sourcePexels = document.getElementById("source-pexels");
    this.sourcePixabay = document.getElementById("source-pixabay");
    this.sourceYouTube = document.getElementById("source-youtube");
    this.sourceWikimedia = document.getElementById("source-wikimedia");
    
    this.filterType = document.getElementById("filter-type");
    this.filterResolution = document.getElementById("filter-resolution");
    
    this.gridContainer = document.getElementById("asset-grid");
    this.paginationContainer = document.getElementById("pagination-container");
    this.loadMoreBtn = document.getElementById("load-more-btn");

    // Bind search action
    if (this.searchBtn) {
      this.searchBtn.addEventListener("click", () => this.executeSearch(true));
    }
    if (this.searchInput) {
      this.searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          this.executeSearch(true);
        }
      });
    }

    // Auto-search on filter change (if query exists)
    const triggerAutoSearch = () => {
      if (this.searchInput.value.trim().length > 0) {
        this.executeSearch(true);
      }
    };

    [this.sourcePexels, this.sourcePixabay, this.sourceYouTube, this.sourceWikimedia, this.filterType, this.filterResolution].forEach(element => {
      if (element) {
        element.addEventListener("change", triggerAutoSearch);
      }
    });

    // Pagination action
    if (this.loadMoreBtn) {
      this.loadMoreBtn.addEventListener("click", () => this.loadNextPage());
    }
  }

  /**
   * Run search query
   * @param {boolean} isNewSearch If true, resets pagination and clears grid
   */
  async executeSearch(isNewSearch = true) {
    if (this.isLoading) return;
    
    const query = this.searchInput.value.trim();
    if (!query) {
      this.clearGrid("Enter keywords above to find stock assets.");
      this.paginationContainer.classList.add("hidden");
      return;
    }

    // Check if the query is a direct URL link
    const isUrl = query.startsWith("http://") || query.startsWith("https://");
    if (isUrl) {
      if (!isNewSearch) return; // Direct URL can only be loaded as a fresh view
      this.isLoading = true;
      this.gridContainer.innerHTML = `
        <div class="loading-spinner-container">
          <div class="spinner"></div>
          <span>Extracting video details...</span>
        </div>
      `;
      try {
        const asset = await window.SearchManager.loadDirectUrl(query);
        this.clearGrid("Paste any video URL or enter keywords above.");
        if (window.AssetDetail && typeof window.AssetDetail.open === "function") {
          window.AssetDetail.open(asset);
        }
      } catch (err) {
        window.Logger.error("SearchView: URL extraction failed", err);
        this.clearGrid(`Error extracting URL: ${err.message}`);
      } finally {
        this.isLoading = false;
      }
      return;
    }

    this.isLoading = true;
    
    if (isNewSearch) {
      this.currentPage = 1;
      this.showSpinner();
      this.paginationContainer.classList.add("hidden");
    } else {
      this.loadMoreBtn.disabled = true;
      this.loadMoreBtn.textContent = "Loading...";
    }

    // Resolve active provider selections
    const selectedProviders = [];
    if (this.sourcePexels && this.sourcePexels.checked) {
      selectedProviders.push(window.Constants.PROVIDERS.PEXELS);
    }
    if (this.sourcePixabay && this.sourcePixabay.checked) {
      selectedProviders.push(window.Constants.PROVIDERS.PIXABAY);
    }
    if (this.sourceYouTube && this.sourceYouTube.checked) {
      selectedProviders.push(window.Constants.PROVIDERS.YOUTUBE);
    }
    if (this.sourceWikimedia && this.sourceWikimedia.checked) {
      selectedProviders.push(window.Constants.PROVIDERS.WIKIMEDIA);
    }

    const type = this.filterType ? this.filterType.value : window.Constants.ASSET_TYPES.VIDEO;
    const resolution = this.filterResolution ? this.filterResolution.value : window.Constants.RESOLUTIONS.ALL;

    try {
      const results = await window.SearchManager.search(query, {
        page: this.currentPage,
        type,
        resolution,
        selectedProviders
      });

      // Clear spinner on new search
      if (isNewSearch) {
        this.gridContainer.innerHTML = "";
      }

      const assets = results.assets || [];
      if (assets.length === 0) {
        if (isNewSearch) {
          this.clearGrid(`No assets found for "${query}" matching your criteria.`);
        } else {
          // No more assets to append
          this.paginationContainer.classList.add("hidden");
        }
      } else {
        // Render assets
        assets.forEach(asset => {
          if (window.AssetCard && typeof window.AssetCard.create === "function") {
            const card = window.AssetCard.create(asset);
            
            // Wire click to open detail panel
            card.addEventListener("click", () => {
              if (window.AssetDetail && typeof window.AssetDetail.open === "function") {
                window.AssetDetail.open(asset);
              }
            });
            
            this.gridContainer.appendChild(card);
          } else {
            window.Logger.warn("SearchView: AssetCard class not available yet.");
          }
        });

        // Toggle pagination button
        if (results.hasMore) {
          this.paginationContainer.classList.remove("hidden");
        } else {
          this.paginationContainer.classList.add("hidden");
        }
      }
    } catch (err) {
      window.Logger.error("SearchView: Search execution failed", err);
      if (isNewSearch) {
        this.clearGrid(`Search Error: ${err.message || "Network request failed"}`);
      } else {
        alert("Search page loading failed: " + err.message);
      }
    } finally {
      this.isLoading = false;
      this.loadMoreBtn.disabled = false;
      this.loadMoreBtn.textContent = "Load More";
    }
  }

  /**
   * Load next page for infinite scroll/pagination
   */
  loadNextPage() {
    this.currentPage++;
    this.executeSearch(false);
  }

  showSpinner() {
    this.gridContainer.innerHTML = `
      <div class="loading-spinner-container">
        <div class="spinner"></div>
        <span>Searching stock databases...</span>
      </div>
    `;
  }

  clearGrid(message = "") {
    this.gridContainer.innerHTML = `<div class="no-results">${message}</div>`;
  }
}

// Instantiate and expose globally
window.SearchView = new SearchView();
if (typeof module !== "undefined") {
  module.exports = window.SearchView;
}
