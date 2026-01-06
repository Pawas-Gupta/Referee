/**
 * Cache Manager for Trade-Off Referee
 * Implements local JSON file-based caching with expiration and cleanup
 * Based on requirements 3.3, 3.4, 4.5
 */

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const ErrorHandler = require('./errorHandler');

class CacheManager {
  constructor(cacheFile = './cache/cache.json') {
    this.cacheFile = path.resolve(cacheFile);
    this.cache = new Map();
    this.defaultTTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    this.cleanupInterval = 60 * 60 * 1000; // 1 hour cleanup interval
    
    // Initialize error handler
    this.errorHandler = new ErrorHandler({
      logLevel: 'error',
      enableRecovery: true
    });
    
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      cleanups: 0,
      errors: 0
    };
    
    this.loadCache();
    this.startCleanupTimer();
  }

  /**
   * Loads cache from file system
   * @private
   */
  loadCache() {
    try {
      // Ensure cache directory exists
      const cacheDir = path.dirname(this.cacheFile);
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }

      // Load existing cache if file exists
      if (fs.existsSync(this.cacheFile)) {
        const data = fs.readFileSync(this.cacheFile, 'utf8');
        const cacheData = JSON.parse(data);
        
        // Convert to Map and filter expired entries
        const now = Date.now();
        for (const [key, entry] of Object.entries(cacheData)) {
          if (entry.expiresAt > now) {
            this.cache.set(key, entry);
          }
        }
      }
    } catch (error) {
      this.stats.errors++;
      
      // Handle cache corruption or file system errors
      if (error instanceof SyntaxError) {
        // JSON parsing error - cache corruption
        const recovery = this.errorHandler.handleCacheCorruption(error, this.cacheFile);
        if (recovery.recovered) {
          this.cache = new Map();
        } else {
          throw new Error(`Cache corruption recovery failed: ${recovery.error}`);
        }
      } else {
        // File system error
        const recovery = this.errorHandler.handleFileSystemError(error, 'read', this.cacheFile);
        if (recovery.recovered) {
          this.cache = new Map();
        } else {
          console.warn('Failed to load cache from file:', error.message);
          this.cache = new Map();
        }
      }
    }
  }

  /**
   * Saves cache to file system
   * @private
   */
  saveCache() {
    try {
      const cacheData = Object.fromEntries(this.cache);
      fs.writeFileSync(this.cacheFile, JSON.stringify(cacheData, null, 2));
    } catch (error) {
      this.stats.errors++;
      
      // Handle file system errors during save
      const recovery = this.errorHandler.handleFileSystemError(error, 'write', this.cacheFile);
      if (!recovery.recovered) {
        console.warn('Failed to save cache to file:', error.message);
      }
    }
  }

  /**
   * Generates a consistent hash for a question
   * @param {string} question - The user's question
   * @returns {string} - Hash of the question
   */
  generateHash(question) {
    if (typeof question !== 'string') {
      throw new Error('Question must be a string');
    }
    
    // Normalize the question (trim and lowercase for consistent hashing)
    const normalized = question.trim().toLowerCase();
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Gets a cached response for a question
   * @param {string} questionHash - Hash of the question
   * @returns {Object|null} - Cached response or null if not found/expired
   */
  get(questionHash) {
    if (typeof questionHash !== 'string') {
      throw new Error('Question hash must be a string');
    }

    const entry = this.cache.get(questionHash);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(questionHash);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.response;
  }

  /**
   * Stores a validated response in cache
   * @param {string} questionHash - Hash of the question
   * @param {Object} response - Validated response object
   * @param {number} ttl - Time to live in milliseconds (optional)
   */
  set(questionHash, response, ttl = this.defaultTTL) {
    if (typeof questionHash !== 'string') {
      throw new Error('Question hash must be a string');
    }
    
    if (!response || typeof response !== 'object') {
      throw new Error('Response must be an object');
    }

    if (typeof ttl !== 'number' || ttl <= 0) {
      throw new Error('TTL must be a positive number');
    }

    const entry = {
      response: response,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
      ttl: ttl
    };

    this.cache.set(questionHash, entry);
    this.stats.sets++;
    
    // Save to file periodically (not on every set for performance)
    if (this.stats.sets % 10 === 0) {
      this.saveCache();
    }
  }

  /**
   * Removes a cached entry
   * @param {string} questionHash - Hash of the question
   * @returns {boolean} - True if entry was removed
   */
  delete(questionHash) {
    if (typeof questionHash !== 'string') {
      throw new Error('Question hash must be a string');
    }

    const deleted = this.cache.delete(questionHash);
    if (deleted) {
      this.stats.deletes++;
    }
    return deleted;
  }

  /**
   * Checks if a question is cached and not expired
   * @param {string} questionHash - Hash of the question
   * @returns {boolean} - True if cached and valid
   */
  has(questionHash) {
    const entry = this.cache.get(questionHash);
    return !!(entry && Date.now() <= entry.expiresAt);
  }

  /**
   * Gets cache statistics
   * @returns {Object} - Cache statistics
   */
  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0,
      totalRequests
    };
  }

  /**
   * Resets cache statistics
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      cleanups: 0
    };
  }

  /**
   * Clears all cached entries
   */
  clear() {
    this.cache.clear();
    this.saveCache();
  }

  /**
   * Removes expired entries from cache
   * @returns {number} - Number of entries removed
   */
  cleanup() {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      this.stats.cleanups++;
      this.saveCache();
    }

    return removed;
  }

  /**
   * Starts automatic cleanup timer
   * @private
   */
  startCleanupTimer() {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Stops automatic cleanup timer
   */
  stopCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Gets all cache entries (for debugging)
   * @returns {Array} - Array of cache entries
   */
  getAllEntries() {
    return Array.from(this.cache.entries()).map(([key, entry]) => ({
      hash: key,
      timestamp: entry.timestamp,
      expiresAt: entry.expiresAt,
      expired: Date.now() > entry.expiresAt,
      response: entry.response
    }));
  }

  /**
   * Saves cache and stops cleanup timer (cleanup method)
   */
  destroy() {
    this.stopCleanupTimer();
    this.saveCache();
  }

  /**
   * Gets cache configuration
   * @returns {Object} - Cache configuration
   */
  getConfig() {
    return {
      cacheFile: this.cacheFile,
      defaultTTL: this.defaultTTL,
      cleanupInterval: this.cleanupInterval
    };
  }

  /**
   * Updates cache configuration
   * @param {Object} config - New configuration
   */
  updateConfig(config) {
    if (config.defaultTTL !== undefined) {
      this.defaultTTL = config.defaultTTL;
    }
    if (config.cleanupInterval !== undefined) {
      this.cleanupInterval = config.cleanupInterval;
      // Restart cleanup timer with new interval
      this.stopCleanupTimer();
      this.startCleanupTimer();
    }
  }
}

module.exports = CacheManager;