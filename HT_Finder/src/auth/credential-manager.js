/**
 * Asset Finder - CEP Credential Manager
 */

class CredentialManager {
  constructor() {
    this.salt = "assetfinder_salt_key_129847";
  }

  /**
   * Simple XOR + Base64 Encryption to avoid storing keys in plain text
   */
  encrypt(text) {
    if (!text) return "";
    let result = "";
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ this.salt.charCodeAt(i % this.salt.length);
      result += String.fromCharCode(charCode);
    }
    return btoa(result); // Base64 encode
  }

  /**
   * Decrypts a XOR + Base64 encoded string
   */
  decrypt(encodedText) {
    if (!encodedText) return null;
    try {
      const text = atob(encodedText);
      let result = "";
      for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i) ^ this.salt.charCodeAt(i % this.salt.length);
        result += String.fromCharCode(charCode);
      }
      return result;
    } catch (e) {
      window.Logger.error("CredentialManager: Failed to decrypt API key", e);
      return null;
    }
  }

  /**
   * Retrieve key from localStorage and decrypt it
   * @param {string} key 
   * @returns {Promise<string|null>}
   */
  async get(key) {
    try {
      const encrypted = window.localStorage.getItem(key);
      if (encrypted) {
        return this.decrypt(encrypted);
      }
    } catch (err) {
      window.Logger.error(`CredentialManager: Error reading key "${key}"`, err);
    }
    return null;
  }

  /**
   * Encrypt key and write to localStorage
   * @param {string} key 
   * @param {string} value 
   * @returns {Promise<boolean>}
   */
  async set(key, value) {
    if (!value || value.trim() === "") {
      return this.delete(key);
    }

    try {
      const encrypted = this.encrypt(value);
      window.localStorage.setItem(key, encrypted);
      return true;
    } catch (err) {
      window.Logger.error(`CredentialManager: Error writing key "${key}"`, err);
      return false;
    }
  }

  /**
   * Delete key from localStorage
   * @param {string} key 
   * @returns {Promise<boolean>}
   */
  async delete(key) {
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch (err) {
      window.Logger.error(`CredentialManager: Error deleting key "${key}"`, err);
      return false;
    }
  }

  // --- Specific key actions ---

  async getPexelsKey() {
    return this.get(window.Constants.STORAGE_KEYS.PEXELS_KEY);
  }

  async setPexelsKey(key) {
    return this.set(window.Constants.STORAGE_KEYS.PEXELS_KEY, key);
  }

  async deletePexelsKey() {
    return this.delete(window.Constants.STORAGE_KEYS.PEXELS_KEY);
  }

  async getPixabayKey() {
    return this.get(window.Constants.STORAGE_KEYS.PIXABAY_KEY);
  }

  async setPixabayKey(key) {
    return this.set(window.Constants.STORAGE_KEYS.PIXABAY_KEY, key);
  }

  async deletePixabayKey() {
    return this.delete(window.Constants.STORAGE_KEYS.PIXABAY_KEY);
  }

  async getYoutubeKey() {
    return this.get(window.Constants.STORAGE_KEYS.YOUTUBE_KEY);
  }

  async setYoutubeKey(key) {
    return this.set(window.Constants.STORAGE_KEYS.YOUTUBE_KEY, key);
  }

  async deleteYoutubeKey() {
    return this.delete(window.Constants.STORAGE_KEYS.YOUTUBE_KEY);
  }
}

// Instantiate and expose globally
window.CredentialManager = new CredentialManager();
if (typeof module !== "undefined") {
  module.exports = window.CredentialManager;
}
