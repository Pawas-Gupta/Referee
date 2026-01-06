/**
 * Application-level Error Handler for Trade-Off Referee
 * Provides centralized error handling, recovery, and logging
 * Based on requirements 4.4
 */

const fs = require('fs');
const path = require('path');

class ErrorHandler {
  constructor(options = {}) {
    this.logLevel = options.logLevel || 'error';
    this.logFile = options.logFile || null;
    this.enableRecovery = options.enableRecovery !== false;
    this.maxRetries = options.maxRetries || 3;
    
    // Error statistics
    this.stats = {
      totalErrors: 0,
      recoveredErrors: 0,
      fatalErrors: 0,
      errorsByType: {},
      errorsBySource: {}
    };
  }

  /**
   * Handles cache corruption errors
   * @param {Error} error - The cache corruption error
   * @param {string} cacheFile - Path to the corrupted cache file
   * @returns {Object} - Recovery result
   */
  handleCacheCorruption(error, cacheFile) {
    this.logError('CACHE_CORRUPTION', error, { cacheFile });
    
    if (!this.enableRecovery) {
      return { recovered: false, error: error.message };
    }

    try {
      // Attempt to backup corrupted cache
      const backupFile = `${cacheFile}.corrupted.${Date.now()}`;
      if (fs.existsSync(cacheFile)) {
        fs.copyFileSync(cacheFile, backupFile);
        this.logInfo(`Backed up corrupted cache to: ${backupFile}`);
      }

      // Remove corrupted cache file
      if (fs.existsSync(cacheFile)) {
        fs.unlinkSync(cacheFile);
      }

      // Create empty cache structure
      const emptyCache = {};
      fs.writeFileSync(cacheFile, JSON.stringify(emptyCache, null, 2));

      this.stats.recoveredErrors++;
      this.logInfo(`Successfully recovered from cache corruption: ${cacheFile}`);

      return {
        recovered: true,
        backupFile,
        message: 'Cache corruption recovered, empty cache created'
      };

    } catch (recoveryError) {
      this.stats.fatalErrors++;
      this.logError('CACHE_RECOVERY_FAILED', recoveryError, { cacheFile });
      
      return {
        recovered: false,
        error: `Failed to recover from cache corruption: ${recoveryError.message}`
      };
    }
  }

  /**
   * Handles file system errors (permissions, disk space, etc.)
   * @param {Error} error - The file system error
   * @param {string} operation - The operation that failed
   * @param {string} filePath - Path to the file involved
   * @returns {Object} - Recovery result
   */
  handleFileSystemError(error, operation, filePath) {
    this.logError('FILE_SYSTEM_ERROR', error, { operation, filePath });

    const errorCode = error.code || 'UNKNOWN';
    let recoveryStrategy = null;
    let recovered = false;

    try {
      switch (errorCode) {
        case 'ENOENT':
          // File or directory doesn't exist
          if (operation === 'read') {
            recoveryStrategy = 'Create empty file/directory';
            this.ensureDirectoryExists(path.dirname(filePath));
            if (filePath.endsWith('.json')) {
              fs.writeFileSync(filePath, '{}');
            }
            recovered = true;
          }
          break;

        case 'EACCES':
        case 'EPERM':
          // Permission denied
          recoveryStrategy = 'Check file permissions';
          this.logError('PERMISSION_DENIED', error, { 
            filePath, 
            suggestion: 'Check file/directory permissions' 
          });
          break;

        case 'ENOSPC':
          // No space left on device
          recoveryStrategy = 'Disk space full - cleanup required';
          this.logError('DISK_FULL', error, { 
            filePath,
            suggestion: 'Free up disk space or use different cache location'
          });
          break;

        case 'EMFILE':
        case 'ENFILE':
          // Too many open files
          recoveryStrategy = 'Too many open files - reduce file handles';
          this.logError('TOO_MANY_FILES', error, { 
            filePath,
            suggestion: 'Reduce concurrent file operations'
          });
          break;

        default:
          recoveryStrategy = 'Unknown file system error';
          break;
      }

      if (recovered) {
        this.stats.recoveredErrors++;
      } else {
        this.stats.fatalErrors++;
      }

      return {
        recovered,
        errorCode,
        recoveryStrategy,
        message: recovered ? 'File system error recovered' : error.message
      };

    } catch (recoveryError) {
      this.stats.fatalErrors++;
      this.logError('FILE_SYSTEM_RECOVERY_FAILED', recoveryError, { filePath, operation });
      
      return {
        recovered: false,
        error: `Failed to recover from file system error: ${recoveryError.message}`
      };
    }
  }

  /**
   * Handles memory pressure situations
   * @param {Error} error - The memory-related error
   * @param {string} component - Component experiencing memory issues
   * @returns {Object} - Recovery result
   */
  handleMemoryPressure(error, component) {
    this.logError('MEMORY_PRESSURE', error, { component });

    try {
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        this.logInfo('Forced garbage collection due to memory pressure');
      }

      // Suggest memory optimization strategies
      const suggestions = [
        'Reduce cache size limits',
        'Clear old cache entries',
        'Reduce concurrent API calls',
        'Restart the application if memory usage continues to grow'
      ];

      this.stats.recoveredErrors++;

      return {
        recovered: true,
        suggestions,
        message: 'Memory pressure handled, garbage collection triggered'
      };

    } catch (recoveryError) {
      this.stats.fatalErrors++;
      return {
        recovered: false,
        error: `Failed to handle memory pressure: ${recoveryError.message}`
      };
    }
  }

  /**
   * Handles API failures with graceful degradation
   * @param {Error} error - The API error
   * @param {string} apiName - Name of the API that failed
   * @param {Object} context - Additional context
   * @returns {Object} - Recovery result
   */
  handleAPIFailure(error, apiName, context = {}) {
    this.logError('API_FAILURE', error, { apiName, ...context });

    const errorCode = error.status || error.statusCode || error.code || 'UNKNOWN';
    let recoveryStrategy = null;
    let gracefulDegradation = false;

    switch (errorCode) {
      case 401:
        recoveryStrategy = 'Check API key configuration';
        break;
      case 429:
        recoveryStrategy = 'Rate limit exceeded - implement backoff';
        gracefulDegradation = true;
        break;
      case 503:
        recoveryStrategy = 'Service unavailable - try fallback or retry later';
        gracefulDegradation = true;
        break;
      case 'ENOTFOUND':
      case 'ECONNREFUSED':
      case 'ETIMEDOUT':
        recoveryStrategy = 'Network connectivity issue';
        gracefulDegradation = true;
        break;
      default:
        recoveryStrategy = 'Unknown API error';
        break;
    }

    if (gracefulDegradation) {
      this.stats.recoveredErrors++;
    } else {
      this.stats.fatalErrors++;
    }

    return {
      recovered: gracefulDegradation,
      errorCode,
      recoveryStrategy,
      gracefulDegradation,
      message: gracefulDegradation 
        ? 'API failure handled with graceful degradation' 
        : error.message
    };
  }

  /**
   * Ensures a directory exists, creating it if necessary
   * @param {string} dirPath - Directory path to ensure
   */
  ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Logs an error with context
   * @param {string} errorType - Type of error
   * @param {Error} error - The error object
   * @param {Object} context - Additional context
   */
  logError(errorType, error, context = {}) {
    this.stats.totalErrors++;
    this.stats.errorsByType[errorType] = (this.stats.errorsByType[errorType] || 0) + 1;
    
    if (context.source) {
      this.stats.errorsBySource[context.source] = (this.stats.errorsBySource[context.source] || 0) + 1;
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      type: errorType,
      message: error.message,
      stack: error.stack,
      context
    };

    this.writeLog(logEntry);
  }

  /**
   * Logs an info message
   * @param {string} message - Info message
   * @param {Object} context - Additional context
   */
  logInfo(message, context = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message,
      context
    };

    this.writeLog(logEntry);
  }

  /**
   * Writes a log entry
   * @param {Object} logEntry - Log entry to write
   * @private
   */
  writeLog(logEntry) {
    const logLine = JSON.stringify(logEntry);
    
    // Always log to console
    if (logEntry.level === 'ERROR') {
      console.error(logLine);
    } else {
      console.log(logLine);
    }

    // Log to file if configured
    if (this.logFile) {
      try {
        this.ensureDirectoryExists(path.dirname(this.logFile));
        fs.appendFileSync(this.logFile, logLine + '\n');
      } catch (error) {
        console.error('Failed to write to log file:', error.message);
      }
    }
  }

  /**
   * Gets error handling statistics
   * @returns {Object} - Error statistics
   */
  getStats() {
    return {
      ...this.stats,
      recoveryRate: this.stats.totalErrors > 0 
        ? (this.stats.recoveredErrors / this.stats.totalErrors) * 100 
        : 0,
      fatalRate: this.stats.totalErrors > 0
        ? (this.stats.fatalErrors / this.stats.totalErrors) * 100
        : 0
    };
  }

  /**
   * Resets error statistics
   */
  resetStats() {
    this.stats = {
      totalErrors: 0,
      recoveredErrors: 0,
      fatalErrors: 0,
      errorsByType: {},
      errorsBySource: {}
    };
  }

  /**
   * Creates a standardized error response
   * @param {string} message - Error message
   * @param {string} code - Error code
   * @param {Object} details - Additional error details
   * @returns {Object} - Standardized error response
   */
  createErrorResponse(message, code = 'INTERNAL_ERROR', details = null) {
    return {
      error: true,
      message,
      code,
      details,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = ErrorHandler;