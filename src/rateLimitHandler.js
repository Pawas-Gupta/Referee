/**
 * Rate Limit Handler for Trade-Off Referee
 * Processes 429 responses and implements exponential backoff logic
 * Based on requirements 2.2
 */

class RateLimitHandler {
  constructor(options = {}) {
    this.baseDelay = options.baseDelay || 1000; // 1 second
    this.maxDelay = options.maxDelay || 30000; // 30 seconds
    this.maxRetries = options.maxRetries || 3;
    this.jitterFactor = options.jitterFactor || 0.1; // 10% jitter
    
    // Statistics tracking
    this.stats = {
      totalRateLimits: 0,
      totalRetries: 0,
      successfulRetries: 0,
      failedRetries: 0,
      totalDelayTime: 0
    };
  }

  /**
   * Handles rate limit errors and calculates appropriate delay
   * @param {Error} error - The rate limit error from API
   * @param {number} retryCount - Current retry attempt number
   * @returns {Object} - Rate limit handling result
   */
  handleRateLimit(error, retryCount = 0) {
    this.stats.totalRateLimits++;
    
    // Check if this is actually a rate limit error
    if (!this.isRateLimitError(error)) {
      return {
        isRateLimit: false,
        shouldRetry: false,
        delay: 0,
        reason: 'Not a rate limit error'
      };
    }

    // Check if we've exceeded max retries
    if (retryCount >= this.maxRetries) {
      this.stats.failedRetries++;
      return {
        isRateLimit: true,
        shouldRetry: false,
        delay: 0,
        reason: 'Maximum retries exceeded',
        maxRetriesReached: true
      };
    }

    // Calculate delay for retry
    const delay = this.calculateBackoffDelay(retryCount, error);
    this.stats.totalRetries++;
    this.stats.totalDelayTime += delay;

    return {
      isRateLimit: true,
      shouldRetry: true,
      delay,
      retryCount: retryCount + 1,
      reason: 'Rate limit detected, retry scheduled',
      retryAfter: this.extractRetryAfter(error)
    };
  }

  /**
   * Determines if an error is a rate limit error
   * @param {Error} error - The error to check
   * @returns {boolean} - True if it's a rate limit error
   */
  isRateLimitError(error) {
    // Check HTTP status code
    if (error.status === 429 || error.statusCode === 429) {
      return true;
    }

    // Check error message for rate limit indicators
    const errorMessage = (error.message || '').toLowerCase();
    const rateLimitKeywords = [
      'rate limit',
      'too many requests',
      'quota exceeded',
      'throttled',
      'rate exceeded'
    ];

    return rateLimitKeywords.some(keyword => errorMessage.includes(keyword));
  }

  /**
   * Calculates exponential backoff delay with jitter
   * @param {number} retryCount - Current retry attempt number
   * @param {Error} error - The rate limit error (may contain retry-after header)
   * @returns {number} - Delay in milliseconds
   */
  calculateBackoffDelay(retryCount, error) {
    // First, check for retry-after header
    const retryAfter = this.extractRetryAfter(error);
    if (retryAfter > 0) {
      // Use retry-after header value, but cap it at maxDelay
      return Math.min(retryAfter * 1000, this.maxDelay);
    }

    // Calculate exponential backoff: baseDelay * 2^retryCount
    const exponentialDelay = this.baseDelay * Math.pow(2, retryCount);
    
    // Add jitter to prevent thundering herd problem
    const jitter = Math.random() * this.jitterFactor * exponentialDelay;
    const totalDelay = exponentialDelay + jitter;
    
    // Cap the delay at maxDelay
    return Math.min(totalDelay, this.maxDelay);
  }

  /**
   * Extracts retry-after value from error headers
   * @param {Error} error - The error that may contain retry-after header
   * @returns {number} - Retry-after value in seconds, or 0 if not found
   */
  extractRetryAfter(error) {
    // Check various possible locations for retry-after header
    const headers = error.headers || error.response?.headers || {};
    
    // Header names are case-insensitive, so check multiple variations
    const retryAfterValue = headers['retry-after'] || 
                           headers['Retry-After'] || 
                           headers['RETRY-AFTER'];

    if (!retryAfterValue) {
      return 0;
    }

    // Parse the retry-after value
    const parsed = parseInt(retryAfterValue, 10);
    return isNaN(parsed) ? 0 : Math.max(0, parsed);
  }

  /**
   * Creates a delay promise for async waiting
   * @param {number} delayMs - Delay in milliseconds
   * @returns {Promise} - Promise that resolves after the delay
   */
  async delay(delayMs) {
    if (delayMs <= 0) {
      return Promise.resolve();
    }

    return new Promise(resolve => {
      setTimeout(resolve, delayMs);
    });
  }

  /**
   * Processes a rate limit error and executes the delay if needed
   * @param {Error} error - The rate limit error
   * @param {number} retryCount - Current retry attempt number
   * @returns {Promise<Object>} - Rate limit handling result after delay
   */
  async processRateLimit(error, retryCount = 0) {
    const result = this.handleRateLimit(error, retryCount);
    
    if (result.shouldRetry && result.delay > 0) {
      // Execute the delay
      await this.delay(result.delay);
      this.stats.successfulRetries++;
    }
    
    return result;
  }

  /**
   * Gets rate limiting statistics
   * @returns {Object} - Statistics about rate limiting
   */
  getStats() {
    return {
      ...this.stats,
      averageDelayTime: this.stats.totalRetries > 0 
        ? this.stats.totalDelayTime / this.stats.totalRetries 
        : 0,
      retrySuccessRate: this.stats.totalRetries > 0
        ? (this.stats.successfulRetries / this.stats.totalRetries) * 100
        : 0
    };
  }

  /**
   * Resets statistics
   */
  resetStats() {
    this.stats = {
      totalRateLimits: 0,
      totalRetries: 0,
      successfulRetries: 0,
      failedRetries: 0,
      totalDelayTime: 0
    };
  }

  /**
   * Gets current configuration
   * @returns {Object} - Current rate limit handler configuration
   */
  getConfig() {
    return {
      baseDelay: this.baseDelay,
      maxDelay: this.maxDelay,
      maxRetries: this.maxRetries,
      jitterFactor: this.jitterFactor
    };
  }

  /**
   * Updates configuration
   * @param {Object} options - New configuration options
   */
  updateConfig(options) {
    if (options.baseDelay !== undefined) this.baseDelay = options.baseDelay;
    if (options.maxDelay !== undefined) this.maxDelay = options.maxDelay;
    if (options.maxRetries !== undefined) this.maxRetries = options.maxRetries;
    if (options.jitterFactor !== undefined) this.jitterFactor = options.jitterFactor;
  }

  /**
   * Creates a rate limit error for testing purposes
   * @param {Object} options - Error options
   * @returns {Error} - Mock rate limit error
   */
  static createMockRateLimitError(options = {}) {
    const error = new Error(options.message || 'Rate limit exceeded');
    error.status = options.status || 429;
    error.statusCode = options.statusCode || 429;
    
    if (options.retryAfter) {
      error.headers = {
        'retry-after': options.retryAfter.toString()
      };
    }
    
    return error;
  }
}

module.exports = RateLimitHandler;