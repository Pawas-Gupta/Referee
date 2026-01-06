/**
 * Unit tests for ErrorHandler
 * Tests error handling, recovery, and logging functionality
 */

const fs = require('fs');
const path = require('path');
const ErrorHandler = require('../src/errorHandler');

describe('ErrorHandler', () => {
  let errorHandler;
  const testLogFile = './cache/test-error.log';

  beforeEach(() => {
    errorHandler = new ErrorHandler({
      logLevel: 'error',
      logFile: testLogFile,
      enableRecovery: true
    });
  });

  afterEach(() => {
    // Clean up test log file
    if (fs.existsSync(testLogFile)) {
      fs.unlinkSync(testLogFile);
    }
  });

  describe('Cache corruption handling', () => {
    test('should handle cache corruption with recovery', () => {
      const testCacheFile = './cache/test-corrupted-cache.json';
      
      // Create a corrupted cache file
      fs.writeFileSync(testCacheFile, '{"invalid": json}');
      
      const error = new SyntaxError('Unexpected token j in JSON');
      const result = errorHandler.handleCacheCorruption(error, testCacheFile);
      
      expect(result.recovered).toBe(true);
      expect(result.backupFile).toContain('corrupted');
      expect(fs.existsSync(testCacheFile)).toBe(true);
      
      // Verify the cache file is now valid JSON
      const content = fs.readFileSync(testCacheFile, 'utf8');
      expect(() => JSON.parse(content)).not.toThrow();
      
      // Clean up
      fs.unlinkSync(testCacheFile);
      if (fs.existsSync(result.backupFile)) {
        fs.unlinkSync(result.backupFile);
      }
    });

    test('should handle cache corruption without recovery when disabled', () => {
      const noRecoveryHandler = new ErrorHandler({ enableRecovery: false });
      const error = new SyntaxError('Invalid JSON');
      
      const result = noRecoveryHandler.handleCacheCorruption(error, './nonexistent.json');
      
      expect(result.recovered).toBe(false);
      expect(result.error).toContain('Invalid JSON');
    });
  });

  describe('File system error handling', () => {
    test('should handle ENOENT error with recovery', () => {
      const error = new Error('File not found');
      error.code = 'ENOENT';
      
      const testFile = './cache/test-missing.json';
      const result = errorHandler.handleFileSystemError(error, 'read', testFile);
      
      expect(result.recovered).toBe(true);
      expect(result.errorCode).toBe('ENOENT');
      expect(fs.existsSync(testFile)).toBe(true);
      
      // Clean up
      fs.unlinkSync(testFile);
    });

    test('should handle permission errors', () => {
      const error = new Error('Permission denied');
      error.code = 'EACCES';
      
      const result = errorHandler.handleFileSystemError(error, 'write', '/root/test.json');
      
      expect(result.recovered).toBe(false);
      expect(result.errorCode).toBe('EACCES');
      expect(result.recoveryStrategy).toContain('permission');
    });

    test('should handle disk full errors', () => {
      const error = new Error('No space left on device');
      error.code = 'ENOSPC';
      
      const result = errorHandler.handleFileSystemError(error, 'write', './test.json');
      
      expect(result.recovered).toBe(false);
      expect(result.errorCode).toBe('ENOSPC');
      expect(result.recoveryStrategy).toContain('Disk space full');
    });
  });

  describe('Memory pressure handling', () => {
    test('should handle memory pressure', () => {
      const error = new Error('JavaScript heap out of memory');
      
      const result = errorHandler.handleMemoryPressure(error, 'TestComponent');
      
      expect(result.recovered).toBe(true);
      expect(result.suggestions).toBeInstanceOf(Array);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('API failure handling', () => {
    test('should handle rate limit errors with graceful degradation', () => {
      const error = new Error('Rate limit exceeded');
      error.status = 429;
      
      const result = errorHandler.handleAPIFailure(error, 'TestAPI');
      
      expect(result.recovered).toBe(true);
      expect(result.gracefulDegradation).toBe(true);
      expect(result.errorCode).toBe(429);
      expect(result.recoveryStrategy).toContain('Rate limit exceeded');
    });

    test('should handle authentication errors', () => {
      const error = new Error('Unauthorized');
      error.status = 401;
      
      const result = errorHandler.handleAPIFailure(error, 'TestAPI');
      
      expect(result.recovered).toBe(false);
      expect(result.errorCode).toBe(401);
      expect(result.recoveryStrategy).toContain('API key');
    });

    test('should handle network errors with graceful degradation', () => {
      const error = new Error('getaddrinfo ENOTFOUND');
      error.code = 'ENOTFOUND';
      
      const result = errorHandler.handleAPIFailure(error, 'TestAPI');
      
      expect(result.recovered).toBe(true);
      expect(result.gracefulDegradation).toBe(true);
      expect(result.recoveryStrategy).toContain('Network connectivity');
    });
  });

  describe('Logging functionality', () => {
    test('should log errors to file', () => {
      const error = new Error('Test error');
      
      errorHandler.logError('TEST_ERROR', error, { testContext: 'value' });
      
      expect(fs.existsSync(testLogFile)).toBe(true);
      
      const logContent = fs.readFileSync(testLogFile, 'utf8');
      const logEntry = JSON.parse(logContent.trim());
      
      expect(logEntry.level).toBe('ERROR');
      expect(logEntry.type).toBe('TEST_ERROR');
      expect(logEntry.message).toBe('Test error');
      expect(logEntry.context.testContext).toBe('value');
    });

    test('should log info messages', () => {
      errorHandler.logInfo('Test info message', { info: 'data' });
      
      expect(fs.existsSync(testLogFile)).toBe(true);
      
      const logContent = fs.readFileSync(testLogFile, 'utf8');
      const logEntry = JSON.parse(logContent.trim());
      
      expect(logEntry.level).toBe('INFO');
      expect(logEntry.message).toBe('Test info message');
      expect(logEntry.context.info).toBe('data');
    });
  });

  describe('Statistics tracking', () => {
    test('should track error statistics', () => {
      const error = new Error('Test error');
      
      errorHandler.handleCacheCorruption(error, './test.json');
      errorHandler.handleMemoryPressure(error, 'TestComponent');
      
      const stats = errorHandler.getStats();
      
      expect(stats.totalErrors).toBe(2);
      expect(stats.recoveredErrors).toBe(2);
      expect(stats.recoveryRate).toBe(100);
      expect(stats.errorsByType.CACHE_CORRUPTION).toBe(1);
      expect(stats.errorsByType.MEMORY_PRESSURE).toBe(1);
    });

    test('should reset statistics', () => {
      const error = new Error('Test error');
      errorHandler.logError('TEST', error);
      
      errorHandler.resetStats();
      const stats = errorHandler.getStats();
      
      expect(stats.totalErrors).toBe(0);
      expect(stats.recoveredErrors).toBe(0);
      expect(stats.fatalErrors).toBe(0);
    });
  });

  describe('Error response creation', () => {
    test('should create standardized error response', () => {
      const response = errorHandler.createErrorResponse(
        'Test error message',
        'TEST_ERROR',
        { detail: 'value' }
      );
      
      expect(response.error).toBe(true);
      expect(response.message).toBe('Test error message');
      expect(response.code).toBe('TEST_ERROR');
      expect(response.details.detail).toBe('value');
      expect(response.timestamp).toBeDefined();
    });

    test('should create error response with defaults', () => {
      const response = errorHandler.createErrorResponse('Simple error');
      
      expect(response.error).toBe(true);
      expect(response.message).toBe('Simple error');
      expect(response.code).toBe('INTERNAL_ERROR');
      expect(response.details).toBe(null);
    });
  });
});