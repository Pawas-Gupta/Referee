/**
 * Groq API Client for Trade-Off Referee
 * Handles API calls with rate limiting and fallback models
 * Based on requirements 2.2, 2.3, 2.5
 */

const Groq = require('groq-sdk');
const RateLimitHandler = require('./rateLimitHandler');

class GroqClient {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('Groq API key is required');
    }
    
    this.apiKey = apiKey;
    this.client = new Groq({ apiKey });
    this.primaryModel = 'llama-3.3-70b-versatile';
    this.fallbackModel = 'mixtral-8x7b-instruct';
    
    // Initialize rate limit handler
    this.rateLimitHandler = new RateLimitHandler({
      baseDelay: 1000, // 1 second
      maxDelay: 30000, // 30 seconds
      maxRetries: 3,
      jitterFactor: 0.1
    });
    
    // Statistics tracking
    this.stats = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      rateLimitHits: 0,
      fallbackUsed: 0,
      totalRetries: 0
    };
  }

  /**
   * Makes an API call to Groq with retry logic and fallback model
   * @param {string} prompt - The prompt to send to the API
   * @param {number} retryCount - Current retry attempt (internal use)
   * @param {boolean} useFallback - Whether to use fallback model
   * @returns {Promise<Object>} - API response object
   */
  async callAPI(prompt, retryCount = 0, useFallback = false) {
    this.stats.totalCalls++;
    
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Prompt must be a non-empty string');
    }

    const model = useFallback ? this.fallbackModel : this.primaryModel;
    
    try {
      const response = await this.client.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        model: model,
        temperature: 0.1, // Low temperature for consistent structured output
        max_tokens: 2048, // Reasonable limit for free tier
        top_p: 0.9,
        stream: false
      });

      this.stats.successfulCalls++;
      
      if (useFallback) {
        this.stats.fallbackUsed++;
      }

      return {
        success: true,
        content: response.choices[0]?.message?.content || '',
        model: model,
        usage: response.usage,
        retryCount,
        usedFallback: useFallback
      };

    } catch (error) {
      return await this._handleError(error, prompt, retryCount, useFallback);
    }
  }

  /**
   * Handles API errors with retry logic and fallback
   * @private
   */
  async _handleError(error, prompt, retryCount, useFallback) {
    this.stats.failedCalls++;
    
    // Use RateLimitHandler to process rate limit errors
    const rateLimitResult = await this.rateLimitHandler.processRateLimit(error, retryCount);
    
    if (rateLimitResult.isRateLimit) {
      this.stats.rateLimitHits++;
      
      if (rateLimitResult.shouldRetry) {
        this.stats.totalRetries++;
        return await this.callAPI(prompt, rateLimitResult.retryCount, useFallback);
      }
    }

    // Check if we should try fallback model
    if (!useFallback && this._shouldUseFallback(error)) {
      this.stats.fallbackUsed++;
      return await this.callAPI(prompt, 0, true); // Reset retry count for fallback
    }

    // If we've exhausted retries and fallback, return error response
    return {
      success: false,
      error: error.message || 'Unknown API error',
      errorCode: error.status || 'UNKNOWN',
      model: useFallback ? this.fallbackModel : this.primaryModel,
      retryCount,
      usedFallback: useFallback
    };
  }

  /**
   * Determines if fallback model should be used
   * @private
   */
  _shouldUseFallback(error) {
    const fallbackTriggers = [
      'model not available',
      'service unavailable',
      'timeout',
      'internal server error'
    ];

    const errorMessage = (error.message || '').toLowerCase();
    return fallbackTriggers.some(trigger => errorMessage.includes(trigger)) ||
           error.status >= 500; // Server errors
  }

  /**
   * Validates API response format
   * @param {string} content - Response content to validate
   * @returns {Object} - Validation result
   */
  validateResponse(content) {
    if (!content || typeof content !== 'string') {
      return {
        valid: false,
        error: 'Response content is empty or not a string'
      };
    }

    try {
      const parsed = JSON.parse(content);
      return {
        valid: true,
        data: parsed
      };
    } catch (parseError) {
      return {
        valid: false,
        error: 'Response is not valid JSON',
        content: content.substring(0, 200) // First 200 chars for debugging
      };
    }
  }

  /**
   * Gets client statistics
   * @returns {Object} - Usage statistics
   */
  getStats() {
    const rateLimitStats = this.rateLimitHandler.getStats();
    
    return {
      ...this.stats,
      successRate: this.stats.totalCalls > 0 
        ? (this.stats.successfulCalls / this.stats.totalCalls) * 100 
        : 0,
      fallbackRate: this.stats.totalCalls > 0
        ? (this.stats.fallbackUsed / this.stats.totalCalls) * 100
        : 0,
      averageRetriesPerCall: this.stats.totalCalls > 0
        ? this.stats.totalRetries / this.stats.totalCalls
        : 0,
      rateLimitHandler: rateLimitStats
    };
  }

  /**
   * Resets statistics
   */
  resetStats() {
    this.stats = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      rateLimitHits: 0,
      fallbackUsed: 0,
      totalRetries: 0
    };
    this.rateLimitHandler.resetStats();
  }

  /**
   * Gets current model configuration
   * @returns {Object} - Model configuration
   */
  getModelConfig() {
    return {
      primaryModel: this.primaryModel,
      fallbackModel: this.fallbackModel,
      rateLimitHandler: this.rateLimitHandler.getConfig()
    };
  }

  /**
   * Updates model configuration
   * @param {Object} config - New configuration
   */
  updateConfig(config) {
    if (config.primaryModel) this.primaryModel = config.primaryModel;
    if (config.fallbackModel) this.fallbackModel = config.fallbackModel;
    if (config.rateLimitHandler) this.rateLimitHandler.updateConfig(config.rateLimitHandler);
  }
}

module.exports = GroqClient;