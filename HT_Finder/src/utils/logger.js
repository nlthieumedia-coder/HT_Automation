/**
 * Asset Finder - Logger Utility
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

// Current run log level
const CURRENT_LOG_LEVEL = LOG_LEVELS.DEBUG;

const logs = [];

class Logger {
  static _log(level, levelName, message, data = null) {
    if (level < CURRENT_LOG_LEVEL) return;

    const timestamp = new Date().toISOString();
    const prefix = `[Asset Finder][${levelName}]`;
    
    const logItem = { timestamp, level: levelName, message, data };
    logs.push(logItem);
    
    // Cap in-memory logs to prevent memory leaks
    if (logs.length > 500) {
      logs.shift();
    }

    if (level === LOG_LEVELS.ERROR) {
      if (data) console.error(prefix, message, data);
      else console.error(prefix, message);
    } else if (level === LOG_LEVELS.WARN) {
      if (data) console.warn(prefix, message, data);
      else console.warn(prefix, message);
    } else {
      if (data) console.log(prefix, message, data);
      else console.log(prefix, message);
    }
  }

  static debug(message, data = null) {
    this._log(LOG_LEVELS.DEBUG, "DEBUG", message, data);
  }

  static info(message, data = null) {
    this._log(LOG_LEVELS.INFO, "INFO", message, data);
  }

  static warn(message, data = null) {
    this._log(LOG_LEVELS.WARN, "WARN", message, data);
  }

  static error(message, data = null) {
    this._log(LOG_LEVELS.ERROR, "ERROR", message, data);
  }

  static getLogs() {
    return logs;
  }
}

// Export to window for global access across scripts
window.Logger = Logger;
if (typeof module !== "undefined") {
  module.exports = Logger;
}
