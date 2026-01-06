/**
 * Trade-Off Service - Integrated API workflow with caching
 * Combines PromptBuilder, GroqClient, ResponseValidator, and CacheManager
 * Based on requirements 3.3, 3.4
 */

const PromptBuilder = require('./promptBuilder');
const GroqClient = require('./groqClient');
const ResponseValidator = require('./responseValidator');
const CacheManager = require('./cacheManager');
const ErrorHandler = require('./errorHandler');

class TradeOffService {
  constructor(apiKey, options = {}) {
    if (!apiKey) {
      throw new Error('Groq API key is required');
    }

    // Initialize error handler first
    this.errorHandler = new ErrorHandler({
      logLevel: options.logLevel || 'error',
      logFile: options.logFile,
      enableRecovery: options.enableRecovery !== false
    });

    // Initialize components
    this.promptBuilder = new PromptBuilder(options.templatePath);
    this.groqClient = new GroqClient(apiKey);
    this.responseValidator = new ResponseValidator();
    this.cacheManager = new CacheManager(options.cacheFile);

    // Service statistics
    this.stats = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      apiCalls: 0,
      validationErrors: 0,
      successfulResponses: 0,
      recoveredErrors: 0
    };
  }

  /**
   * Analyzes a user question and returns structured trade-off analysis
   * Implements cache-first behavior: check cache → API call → validation → cache storage
   * @param {string} userQuestion - The user's decision-oriented question
   * @returns {Promise<Object>} - Analysis result with success status and data
   */
  async analyze(userQuestion) {
    this.stats.totalRequests++;

    try {
      // Validate input
      if (!userQuestion || typeof userQuestion !== 'string') {
        throw new Error('User question must be a non-empty string');
      }

      const trimmedQuestion = userQuestion.trim();
      if (trimmedQuestion.length < 10) {
        throw new Error('Question must be at least 10 characters long');
      }

      if (trimmedQuestion.length > 500) {
        throw new Error('Question must be no more than 500 characters long');
      }

      // Generate cache key
      const questionHash = this.cacheManager.generateHash(trimmedQuestion);

      // Step 1: Check cache first
      const cachedResponse = this.cacheManager.get(questionHash);
      if (cachedResponse) {
        this.stats.cacheHits++;
        this.stats.successfulResponses++;
        
        return {
          success: true,
          data: cachedResponse,
          cached: true,
          source: 'cache',
          questionHash
        };
      }

      this.stats.cacheMisses++;

      // Step 2: Build prompt
      const prompt = this.promptBuilder.buildPrompt(trimmedQuestion);

      // Step 3: Make API call
      this.stats.apiCalls++;
      const apiResponse = await this.groqClient.callAPI(prompt);

      if (!apiResponse.success) {
        // Handle API failures with error handler
        const recovery = this.errorHandler.handleAPIFailure(
          { message: apiResponse.error, status: apiResponse.errorCode },
          'Groq API',
          { questionHash, prompt: prompt.substring(0, 100) + '...' }
        );

        if (recovery.gracefulDegradation) {
          this.stats.recoveredErrors++;
        }

        return {
          success: false,
          error: apiResponse.error,
          errorCode: apiResponse.errorCode,
          source: 'api',
          questionHash,
          recovery: recovery.recoveryStrategy
        };
      }

      // Step 4: Validate and normalize response
      const validationResult = this.responseValidator.validateAndNormalize(apiResponse.content);

      if (!validationResult.success) {
        this.stats.validationErrors++;
        
        // Log validation failure for debugging
        this.errorHandler.logError('VALIDATION_FAILED', 
          new Error('API response validation failed'), 
          { 
            questionHash, 
            errors: validationResult.errors,
            responsePreview: apiResponse.content?.substring(0, 200) + '...'
          }
        );

        return {
          success: false,
          error: 'Failed to validate API response',
          details: validationResult.errors,
          source: 'validation',
          questionHash
        };
      }

      // Step 5: Store in cache (with error handling)
      try {
        this.cacheManager.set(questionHash, validationResult.data);
      } catch (cacheError) {
        // Cache storage failed, but we can still return the result
        this.errorHandler.logError('CACHE_STORAGE_FAILED', cacheError, { questionHash });
        // Continue execution - cache failure shouldn't break the response
      }

      this.stats.successfulResponses++;

      return {
        success: true,
        data: validationResult.data,
        cached: false,
        source: 'api',
        questionHash,
        apiModel: apiResponse.model,
        usedFallback: apiResponse.usedFallback,
        normalized: validationResult.normalized
      };

    } catch (error) {
      // Handle unexpected service errors
      this.errorHandler.logError('SERVICE_ERROR', error, { 
        userQuestion: userQuestion?.substring(0, 100) + '...',
        stack: error.stack 
      });

      // Check if it's a memory-related error
      if (error.message?.includes('memory') || error.name === 'RangeError') {
        const recovery = this.errorHandler.handleMemoryPressure(error, 'TradeOffService');
        if (recovery.recovered) {
          this.stats.recoveredErrors++;
        }
      }

      return {
        success: false,
        error: error.message,
        source: 'service',
        questionHash: null,
        errorType: error.name || 'UnknownError'
      };
    }
  }

  /**
   * Checks if a question is likely decision-oriented
   * @param {string} userQuestion - The user's question
   * @returns {boolean} - True if question appears decision-oriented
   */
  isDecisionOriented(userQuestion) {
    return this.promptBuilder.isDecisionOriented(userQuestion);
  }

  /**
   * Estimates token count for a question
   * @param {string} userQuestion - The user's question
   * @returns {number} - Estimated token count
   */
  estimateTokenCount(userQuestion) {
    return this.promptBuilder.estimateTokenCount(userQuestion);
  }

  /**
   * Gets comprehensive service statistics
   * @returns {Object} - Combined statistics from all components
   */
  getStats() {
    const cacheStats = this.cacheManager.getStats();
    const groqStats = this.groqClient.getStats();
    const validatorStats = this.responseValidator.getStats();
    const errorStats = this.errorHandler.getStats();

    return {
      service: {
        ...this.stats,
        cacheHitRate: this.stats.totalRequests > 0 
          ? (this.stats.cacheHits / this.stats.totalRequests) * 100 
          : 0,
        successRate: this.stats.totalRequests > 0
          ? (this.stats.successfulResponses / this.stats.totalRequests) * 100
          : 0,
        errorRecoveryRate: this.stats.totalRequests > 0
          ? (this.stats.recoveredErrors / this.stats.totalRequests) * 100
          : 0
      },
      cache: cacheStats,
      groq: groqStats,
      validator: validatorStats,
      errorHandler: errorStats
    };
  }

  /**
   * Resets all statistics
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      apiCalls: 0,
      validationErrors: 0,
      successfulResponses: 0
    };
    
    this.groqClient.resetStats();
    this.responseValidator.resetStats();
    // Note: CacheManager stats are persistent and not reset
  }

  /**
   * Clears the cache
   */
  clearCache() {
    this.cacheManager.clear();
  }

  /**
   * Gets cache information for a specific question
   * @param {string} userQuestion - The user's question
   * @returns {Object} - Cache information
   */
  getCacheInfo(userQuestion) {
    const questionHash = this.cacheManager.generateHash(userQuestion);
    const cached = this.cacheManager.has(questionHash);
    
    return {
      questionHash,
      cached,
      cacheSize: this.cacheManager.cache.size
    };
  }

  /**
   * Validates a question without processing it
   * @param {string} userQuestion - The user's question
   * @returns {Object} - Validation result
   */
  validateQuestion(userQuestion) {
    const errors = [];
    
    if (!userQuestion || typeof userQuestion !== 'string') {
      errors.push('Question must be a non-empty string');
    } else {
      const trimmed = userQuestion.trim();
      if (trimmed.length < 10) {
        errors.push('Question must be at least 10 characters long');
      }
      if (trimmed.length > 500) {
        errors.push('Question must be no more than 500 characters long');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      isDecisionOriented: errors.length === 0 ? this.isDecisionOriented(userQuestion) : false,
      estimatedTokens: errors.length === 0 ? this.estimateTokenCount(userQuestion) : 0
    };
  }

  /**
   * Gets configuration from all components
   * @returns {Object} - Combined configuration
   */
  getConfig() {
    return {
      groq: this.groqClient.getModelConfig(),
      cache: this.cacheManager.getConfig(),
      prompt: this.promptBuilder.getTemplateStats()
    };
  }

  /**
   * Updates configuration for components
   * @param {Object} config - Configuration updates
   */
  updateConfig(config) {
    if (config.groq) {
      this.groqClient.updateConfig(config.groq);
    }
    if (config.cache) {
      this.cacheManager.updateConfig(config.cache);
    }
    if (config.prompt && config.prompt.template) {
      this.promptBuilder.setTemplate(config.prompt.template);
    }
  }

  /**
   * Cleanup method - saves cache and stops timers
   */
  destroy() {
    this.cacheManager.destroy();
  }
}

module.exports = TradeOffService;