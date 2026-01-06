/**
 * Express Server for Trade-Off Referee
 * Main application entry point with middleware and error handling
 * Based on requirements 4.1, 4.4
 */

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const TradeOffService = require('./tradeOffService');
const { validateInput, createErrorResponse } = require('./schemas');

class TradeOffServer {
  constructor(options = {}) {
    this.app = express();
    this.port = options.port || process.env.PORT || 3000;
    this.apiKey = options.apiKey || process.env.GROQ_API_KEY;
    
    if (!this.apiKey) {
      throw new Error('Groq API key is required. Set GROQ_API_KEY environment variable or pass apiKey option.');
    }

    // Enhanced configuration with environment variables
    this.config = this.buildConfiguration(options);

    // Initialize the trade-off service with enhanced configuration
    this.tradeOffService = new TradeOffService(this.apiKey, {
      cacheFile: this.config.cache.file,
      templatePath: this.config.prompt.templatePath,
      logLevel: this.config.logging.level,
      logFile: this.config.logging.file,
      enableRecovery: this.config.errorHandling.enableRecovery
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    this.configureComponents();
  }

  /**
   * Configures all components with the enhanced configuration
   * @private
   */
  configureComponents() {
    // Configure the TradeOffService components
    this.tradeOffService.updateConfig({
      groq: {
        primaryModel: this.config.groq.primaryModel,
        fallbackModel: this.config.groq.fallbackModel,
        rateLimitHandler: {
          maxRetries: this.config.groq.maxRetries,
          baseDelay: this.config.groq.baseDelay,
          maxDelay: this.config.groq.maxDelay
        }
      },
      cache: {
        ttl: this.config.cache.ttl,
        maxSize: this.config.cache.maxSize
      }
    });
  }

  /**
   * Gets comprehensive configuration information
   * @returns {Object} - Complete server and service configuration
   */
  getConfiguration() {
    return {
      server: this.config.server,
      cache: this.config.cache,
      prompt: this.config.prompt,
      logging: this.config.logging,
      errorHandling: this.config.errorHandling,
      groq: this.config.groq,
      service: this.tradeOffService.getConfig()
    };
  }

  /**
   * Generates a unique request ID for tracking
   * @returns {string} - Unique request identifier
   * @private
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Logs detailed request information
   * @param {Object} req - Express request object
   * @private
   */
  logRequest(req) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      type: 'REQUEST',
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      contentLength: req.get('Content-Length'),
      contentType: req.get('Content-Type'),
      body: req.method === 'POST' ? this.sanitizeRequestBody(req.body) : undefined
    };

    this.writeMonitoringLog(logEntry);
  }

  /**
   * Logs detailed response information
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Object} data - Response data
   * @param {number} responseTime - Response time in milliseconds
   * @private
   */
  logResponse(req, res, data, responseTime) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      type: 'RESPONSE',
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime,
      success: !data.error,
      cached: data.metadata?.cached,
      apiModel: data.metadata?.apiModel,
      questionHash: data.metadata?.questionHash || data.questionHash,
      errorCode: data.code,
      contentLength: JSON.stringify(data).length
    };

    this.writeMonitoringLog(logEntry);
    this.updateMetrics(logEntry);
  }

  /**
   * Sanitizes request body for logging (removes sensitive data)
   * @param {Object} body - Request body
   * @returns {Object} - Sanitized body
   * @private
   */
  sanitizeRequestBody(body) {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };
    
    // Remove or truncate sensitive fields
    if (sanitized.question && sanitized.question.length > 100) {
      sanitized.question = sanitized.question.substring(0, 100) + '...';
    }

    return sanitized;
  }

  /**
   * Writes monitoring log entry
   * @param {Object} logEntry - Log entry to write
   * @private
   */
  writeMonitoringLog(logEntry) {
    const logLine = JSON.stringify(logEntry);
    
    // Log to console if enabled
    if (this.config.logging.enableConsole && this.config.logging.level !== 'error') {
      console.log(logLine);
    }

    // Log to file if configured
    if (this.config.logging.file) {
      try {
        const fs = require('fs');
        const path = require('path');
        
        // Ensure log directory exists
        const logDir = path.dirname(this.config.logging.file);
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
        
        fs.appendFileSync(this.config.logging.file, logLine + '\n');
      } catch (error) {
        console.error('Failed to write to monitoring log file:', error.message);
      }
    }
  }

  /**
   * Updates server metrics based on response
   * @param {Object} logEntry - Response log entry
   * @private
   */
  updateMetrics(logEntry) {
    if (!this.metrics) {
      this.metrics = {
        requests: {
          total: 0,
          successful: 0,
          failed: 0,
          byEndpoint: {},
          byStatusCode: {}
        },
        performance: {
          totalResponseTime: 0,
          averageResponseTime: 0,
          minResponseTime: Infinity,
          maxResponseTime: 0
        },
        cache: {
          hits: 0,
          misses: 0,
          hitRate: 0
        },
        api: {
          calls: 0,
          modelUsage: {},
          errors: 0
        }
      };
    }

    // Update request metrics
    this.metrics.requests.total++;
    
    if (logEntry.success) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }

    // Update endpoint metrics
    const endpoint = logEntry.path;
    this.metrics.requests.byEndpoint[endpoint] = (this.metrics.requests.byEndpoint[endpoint] || 0) + 1;

    // Update status code metrics
    const statusCode = logEntry.statusCode;
    this.metrics.requests.byStatusCode[statusCode] = (this.metrics.requests.byStatusCode[statusCode] || 0) + 1;

    // Update performance metrics
    const responseTime = logEntry.responseTime;
    this.metrics.performance.totalResponseTime += responseTime;
    this.metrics.performance.averageResponseTime = this.metrics.performance.totalResponseTime / this.metrics.requests.total;
    this.metrics.performance.minResponseTime = Math.min(this.metrics.performance.minResponseTime, responseTime);
    this.metrics.performance.maxResponseTime = Math.max(this.metrics.performance.maxResponseTime, responseTime);

    // Update cache metrics
    if (logEntry.cached !== undefined) {
      if (logEntry.cached) {
        this.metrics.cache.hits++;
      } else {
        this.metrics.cache.misses++;
      }
      
      const totalCacheRequests = this.metrics.cache.hits + this.metrics.cache.misses;
      this.metrics.cache.hitRate = totalCacheRequests > 0 ? (this.metrics.cache.hits / totalCacheRequests) * 100 : 0;
    }

    // Update API metrics
    if (logEntry.apiModel) {
      this.metrics.api.calls++;
      this.metrics.api.modelUsage[logEntry.apiModel] = (this.metrics.api.modelUsage[logEntry.apiModel] || 0) + 1;
    }

    if (!logEntry.success && logEntry.errorCode) {
      this.metrics.api.errors++;
    }
  }

  /**
   * Gets current server metrics
   * @returns {Object} - Server metrics
   */
  getMetrics() {
    return this.metrics || {
      requests: { total: 0, successful: 0, failed: 0, byEndpoint: {}, byStatusCode: {} },
      performance: { totalResponseTime: 0, averageResponseTime: 0, minResponseTime: 0, maxResponseTime: 0 },
      cache: { hits: 0, misses: 0, hitRate: 0 },
      api: { calls: 0, modelUsage: {}, errors: 0 }
    };
  }

  /**
   * Builds comprehensive configuration from options and environment variables
   * @param {Object} options - Constructor options
   * @returns {Object} - Complete configuration object
   * @private
   */
  buildConfiguration(options) {
    return {
      server: {
        port: this.port,
        corsOrigin: process.env.CORS_ORIGIN || options.corsOrigin || '*',
        rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || options.rateLimitMax || 100,
        rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || options.rateLimitWindow || 15 * 60 * 1000
      },
      cache: {
        file: options.cacheFile || process.env.CACHE_FILE || './cache/production-cache.json',
        ttl: parseInt(process.env.CACHE_TTL) || options.cacheTtl || 24 * 60 * 60 * 1000,
        maxSize: parseInt(process.env.CACHE_MAX_SIZE) || options.cacheMaxSize || 1000
      },
      prompt: {
        templatePath: options.templatePath || process.env.PROMPT_TEMPLATE_PATH
      },
      logging: {
        level: options.logLevel || process.env.LOG_LEVEL || 'error',
        file: options.logFile || process.env.LOG_FILE,
        enableConsole: (process.env.LOG_CONSOLE !== 'false') && (options.enableConsoleLog !== false)
      },
      errorHandling: {
        enableRecovery: (process.env.ENABLE_ERROR_RECOVERY !== 'false') && (options.enableRecovery !== false),
        maxRetries: parseInt(process.env.ERROR_MAX_RETRIES) || options.errorMaxRetries || 3
      },
      groq: {
        primaryModel: options.primaryModel || process.env.GROQ_PRIMARY_MODEL || 'llama-3.3-70b-versatile',
        fallbackModel: options.fallbackModel || process.env.GROQ_FALLBACK_MODEL || 'mixtral-8x7b-instruct',
        maxRetries: parseInt(process.env.GROQ_MAX_RETRIES) || options.groqMaxRetries || 3,
        baseDelay: parseInt(process.env.GROQ_BASE_DELAY) || options.groqBaseDelay || 1000,
        maxDelay: parseInt(process.env.GROQ_MAX_DELAY) || options.groqMaxDelay || 30000
      }
    };
  }

  /**
   * Sets up Express middleware
   * @private
   */
  setupMiddleware() {
    // CORS configuration
    this.app.use(cors({
      origin: this.config.server.corsOrigin,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: false
    }));

    // Security headers (must be first to apply to all responses including errors)
    this.app.use((req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      next();
    });

    // JSON parsing with size limit
    this.app.use(express.json({ 
      limit: '10mb',
      strict: true
    }));

    // URL encoded parsing
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: '10mb' 
    }));

    // Rate limiting with configuration
    const limiter = rateLimit({
      windowMs: this.config.server.rateLimitWindow,
      max: this.config.server.rateLimitMax,
      message: {
        error: true,
        message: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: `${Math.ceil(this.config.server.rateLimitWindow / 60000)} minutes`
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    this.app.use('/api/', limiter);

    // Request logging with detailed information
    this.app.use((req, res, next) => {
      if (this.config.logging.enableConsole) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);
      }
      
      // Enhanced request logging for monitoring
      req.requestId = this.generateRequestId();
      req.startTime = Date.now();
      
      // Log detailed request information for API endpoints
      if (req.path.startsWith('/api/') && this.config.logging.level !== 'error') {
        this.logRequest(req);
      }
      
      next();
    });

    // Request timing and response logging
    this.app.use((req, res, next) => {
      req.startTime = Date.now();
      
      // Override res.json to add response time header and logging
      const originalJson = res.json;
      res.json = function(data) {
        const responseTime = Date.now() - req.startTime;
        res.setHeader('X-Response-Time', `${responseTime}ms`);
        
        // Log response for monitoring
        if (req.path.startsWith('/api/') && req.server?.config?.logging?.level !== 'error') {
          req.server?.logResponse(req, res, data, responseTime);
        }
        
        return originalJson.call(this, data);
      };
      
      // Store server reference for logging
      req.server = this;
      
      next();
    });
  }

  /**
   * Sets up API routes
   * @private
   */
  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      const stats = this.tradeOffService.getStats();
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        stats: {
          totalRequests: stats.service.totalRequests,
          cacheHitRate: stats.service.cacheHitRate,
          successRate: stats.service.successRate
        }
      });
    });

    // API info endpoint
    this.app.get('/api/info', (req, res) => {
      const config = this.tradeOffService.getConfig();
      res.json({
        name: 'Trade-Off Referee API',
        version: process.env.npm_package_version || '1.0.0',
        description: 'Decision-support tool that generates structured trade-off analysis',
        endpoints: {
          '/health': 'Health check and basic stats',
          '/api/info': 'API information',
          '/api/compare': 'POST - Analyze trade-offs for a decision question',
          '/api/validate': 'POST - Validate a question without processing',
          '/api/stats': 'GET - Detailed service statistics',
          '/api/metrics': 'GET - Server and performance metrics'
        },
        models: {
          primary: config.groq.primaryModel,
          fallback: config.groq.fallbackModel
        },
        limits: {
          questionMinLength: 10,
          questionMaxLength: 500,
          rateLimit: process.env.RATE_LIMIT_MAX || 100
        }
      });
    });

    // Question validation endpoint
    this.app.post('/api/validate', (req, res) => {
      try {
        const inputValidation = validateInput(req.body);
        
        if (!inputValidation.valid) {
          return res.status(400).json(createErrorResponse(inputValidation.errors));
        }

        const questionValidation = this.tradeOffService.validateQuestion(inputValidation.data.question);
        
        res.json({
          success: true,
          validation: questionValidation,
          cacheInfo: this.tradeOffService.getCacheInfo(inputValidation.data.question)
        });

      } catch (error) {
        console.error('Validation error:', error);
        res.status(500).json(createErrorResponse(['Internal server error during validation']));
      }
    });

    // Statistics endpoint
    this.app.get('/api/stats', (req, res) => {
      try {
        const stats = this.tradeOffService.getStats();
        res.json({
          success: true,
          stats,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json(createErrorResponse(['Failed to retrieve statistics']));
      }
    });

    // Metrics endpoint for monitoring
    this.app.get('/api/metrics', (req, res) => {
      try {
        const serverMetrics = this.getMetrics();
        const serviceStats = this.tradeOffService.getStats();
        
        res.json({
          success: true,
          metrics: {
            server: serverMetrics,
            service: serviceStats,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        console.error('Metrics error:', error);
        res.status(500).json(createErrorResponse(['Failed to retrieve metrics']));
      }
    });

    // Main compare endpoint - analyzes trade-offs for user questions
    this.app.post('/api/compare', async (req, res) => {
      try {
        // Validate input
        const inputValidation = validateInput(req.body);
        
        if (!inputValidation.valid) {
          return res.status(400).json(createErrorResponse(inputValidation.errors));
        }

        const { question } = inputValidation.data;

        // Process the question through the complete analysis pipeline
        const result = await this.tradeOffService.analyze(question);

        if (!result.success) {
          // Handle different types of errors with appropriate status codes
          let statusCode = 500;
          let errorCode = 'INTERNAL_ERROR';

          if (result.source === 'api') {
            if (result.errorCode === 'RATE_LIMIT_EXCEEDED' || result.errorCode === '429' || result.errorCode === 429) {
              statusCode = 429;
              errorCode = 'RATE_LIMIT_EXCEEDED';
            } else if (result.errorCode === 'AUTHENTICATION_ERROR' || result.errorCode === '401' || result.errorCode === 401) {
              statusCode = 401;
              errorCode = 'AUTHENTICATION_ERROR';
            } else if (result.errorCode === 'API_UNAVAILABLE' || result.errorCode === '503' || result.errorCode === 503) {
              statusCode = 503;
              errorCode = 'SERVICE_UNAVAILABLE';
            } else if (result.errorCode === '400' || result.errorCode === 400) {
              statusCode = 400;
              errorCode = 'BAD_REQUEST';
            }
          } else if (result.source === 'service') {
            statusCode = 400;
            errorCode = 'INVALID_INPUT';
          } else if (result.source === 'validation') {
            statusCode = 502;
            errorCode = 'INVALID_API_RESPONSE';
          }

          return res.status(statusCode).json({
            error: true,
            message: result.error,
            code: errorCode,
            details: result.details || null,
            timestamp: new Date().toISOString(),
            questionHash: result.questionHash
          });
        }

        // Success response with structured JSON matching schema
        const response = {
          success: true,
          data: result.data,
          metadata: {
            cached: result.cached,
            source: result.source,
            questionHash: result.questionHash,
            timestamp: new Date().toISOString(),
            processingTime: Date.now() - req.startTime
          }
        };

        // Add API-specific metadata if available
        if (result.apiModel) {
          response.metadata.apiModel = result.apiModel;
        }
        if (result.usedFallback !== undefined) {
          response.metadata.usedFallback = result.usedFallback;
        }
        if (result.normalized !== undefined) {
          response.metadata.normalized = result.normalized;
        }

        res.json(response);

      } catch (error) {
        console.error('Compare endpoint error:', error);
        res.status(500).json({
          error: true,
          message: 'Internal server error',
          code: 'INTERNAL_ERROR',
          timestamp: new Date().toISOString()
        });
      }
    });

    // 404 handler for unknown routes
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: true,
        message: 'Endpoint not found',
        code: 'NOT_FOUND',
        availableEndpoints: ['/health', '/api/info', '/api/compare', '/api/validate', '/api/stats', '/api/metrics']
      });
    });
  }

  /**
   * Sets up error handling middleware
   * @private
   */
  setupErrorHandling() {
    // JSON parsing error handler
    this.app.use((error, req, res, next) => {
      if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
        const responseTime = req.startTime ? Date.now() - req.startTime : 0;
        res.setHeader('X-Response-Time', `${responseTime}ms`);
        return res.status(400).json(createErrorResponse(['Invalid JSON in request body']));
      }
      next(error);
    });

    // URL decoding error handler
    this.app.use((error, req, res, next) => {
      if (error instanceof URIError || (error.statusCode === 400 && error.message && error.message.includes('Failed to decode param'))) {
        const responseTime = req.startTime ? Date.now() - req.startTime : 0;
        res.setHeader('X-Response-Time', `${responseTime}ms`);
        return res.status(400).json({
          error: true,
          message: 'Invalid URL encoding',
          code: 'INVALID_URL_ENCODING',
          timestamp: new Date().toISOString()
        });
      }
      next(error);
    });

    // General error handler
    this.app.use((error, req, res, next) => {
      console.error('Unhandled error:', error);
      
      const statusCode = error.statusCode || error.status || 500;
      const message = error.message || 'Internal server error';
      
      const responseTime = req.startTime ? Date.now() - req.startTime : 0;
      res.setHeader('X-Response-Time', `${responseTime}ms`);
      
      res.status(statusCode).json({
        error: true,
        message: statusCode === 500 ? 'Internal server error' : message,
        code: error.code || 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Starts the server
   * @param {Function} callback - Optional callback function
   * @returns {Promise} - Promise that resolves when server starts
   */
  start(callback) {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, (error) => {
          if (error) {
            reject(error);
            return;
          }
          
          console.log(`🚀 Trade-Off Referee server running on port ${this.port}`);
          console.log(`📊 Health check: http://localhost:${this.port}/health`);
          console.log(`📖 API info: http://localhost:${this.port}/api/info`);
          
          if (callback) callback();
          resolve(this.server);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stops the server gracefully
   * @returns {Promise} - Promise that resolves when server stops
   */
  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('🛑 Server stopped gracefully');
          this.tradeOffService.destroy();
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Gets the Express app instance
   * @returns {Express} - Express app
   */
  getApp() {
    return this.app;
  }

  /**
   * Gets the TradeOffService instance
   * @returns {TradeOffService} - Service instance
   */
  getService() {
    return this.tradeOffService;
  }
}

module.exports = TradeOffServer;

// If this file is run directly, start the server
if (require.main === module) {
  const server = new TradeOffServer();
  
  server.start().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    await server.stop();
    process.exit(0);
  });
}