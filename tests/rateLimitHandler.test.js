/**
 * Unit tests for RateLimitHandler
 * Tests rate limit detection, backoff calculation, and retry logic
 */

const RateLimitHandler = require('../src/rateLimitHandler');

describe('RateLimitHandler', () => {
  let handler;

  beforeEach(() => {
    handler = new RateLimitHandler({
      baseDelay: 1000,
      maxDelay: 10000,
      maxRetries: 3,
      jitterFactor: 0.1
    });
  });

  describe('Rate limit detection', () => {
    test('should detect 429 status code as rate limit', () => {
      const error = new Error('Rate limit exceeded');
      error.status = 429;

      const result = handler.handleRateLimit(error, 0);
      
      expect(result.isRateLimit).toBe(true);
      expect(result.shouldRetry).toBe(true);
    });

    test('should detect rate limit keywords in error message', () => {
      const testCases = [
        'Rate limit exceeded',
        'Too many requests',
        'Quota exceeded',
        'Request throttled',
        'Rate exceeded'
      ];

      testCases.forEach(message => {
        const error = new Error(message);
        const result = handler.handleRateLimit(error, 0);
        
        expect(result.isRateLimit).toBe(true);
        expect(result.shouldRetry).toBe(true);
      });
    });

    test('should not detect non-rate-limit errors', () => {
      const error = new Error('Internal server error');
      error.status = 500;

      const result = handler.handleRateLimit(error, 0);
      
      expect(result.isRateLimit).toBe(false);
      expect(result.shouldRetry).toBe(false);
    });
  });

  describe('Retry logic', () => {
    test('should allow retries within max limit', () => {
      const error = RateLimitHandler.createMockRateLimitError();

      for (let i = 0; i < 3; i++) {
        const result = handler.handleRateLimit(error, i);
        expect(result.shouldRetry).toBe(true);
        expect(result.retryCount).toBe(i + 1);
      }
    });

    test('should stop retries after max limit', () => {
      const error = RateLimitHandler.createMockRateLimitError();

      const result = handler.handleRateLimit(error, 3);
      
      expect(result.shouldRetry).toBe(false);
      expect(result.maxRetriesReached).toBe(true);
    });
  });

  describe('Backoff delay calculation', () => {
    test('should calculate exponential backoff', () => {
      const error = RateLimitHandler.createMockRateLimitError();

      const delay0 = handler.calculateBackoffDelay(0, error);
      const delay1 = handler.calculateBackoffDelay(1, error);
      const delay2 = handler.calculateBackoffDelay(2, error);

      // Should increase exponentially (with some jitter tolerance)
      expect(delay1).toBeGreaterThan(delay0);
      expect(delay2).toBeGreaterThan(delay1);
      
      // Should be within reasonable bounds
      expect(delay0).toBeGreaterThanOrEqual(1000); // Base delay
      expect(delay0).toBeLessThanOrEqual(1100); // Base + 10% jitter
      expect(delay2).toBeLessThanOrEqual(10000); // Max delay
    });

    test('should use retry-after header when available', () => {
      const error = RateLimitHandler.createMockRateLimitError({
        retryAfter: 5
      });

      const delay = handler.calculateBackoffDelay(0, error);
      
      expect(delay).toBe(5000); // 5 seconds in milliseconds
    });

    test('should cap delay at maxDelay', () => {
      const error = RateLimitHandler.createMockRateLimitError({
        retryAfter: 60 // 60 seconds
      });

      const delay = handler.calculateBackoffDelay(0, error);
      
      expect(delay).toBe(10000); // Capped at maxDelay (10 seconds)
    });
  });

  describe('Retry-after header extraction', () => {
    test('should extract retry-after from headers', () => {
      const error = new Error('Rate limit');
      error.headers = { 'retry-after': '30' };

      const retryAfter = handler.extractRetryAfter(error);
      
      expect(retryAfter).toBe(30);
    });

    test('should handle case-insensitive headers', () => {
      const testCases = [
        { 'retry-after': '15' },
        { 'Retry-After': '15' },
        { 'RETRY-AFTER': '15' }
      ];

      testCases.forEach(headers => {
        const error = new Error('Rate limit');
        error.headers = headers;

        const retryAfter = handler.extractRetryAfter(error);
        expect(retryAfter).toBe(15);
      });
    });

    test('should return 0 when no retry-after header', () => {
      const error = new Error('Rate limit');
      
      const retryAfter = handler.extractRetryAfter(error);
      
      expect(retryAfter).toBe(0);
    });

    test('should handle invalid retry-after values', () => {
      const error = new Error('Rate limit');
      error.headers = { 'retry-after': 'invalid' };

      const retryAfter = handler.extractRetryAfter(error);
      
      expect(retryAfter).toBe(0);
    });
  });

  describe('Statistics tracking', () => {
    test('should track rate limit statistics', () => {
      const error = RateLimitHandler.createMockRateLimitError();

      // Process several rate limits
      handler.handleRateLimit(error, 0);
      handler.handleRateLimit(error, 1);
      handler.handleRateLimit(error, 2);

      const stats = handler.getStats();
      
      expect(stats.totalRateLimits).toBe(3);
      expect(stats.totalRetries).toBe(3);
      expect(stats.averageDelayTime).toBeGreaterThan(0);
    });

    test('should reset statistics', () => {
      const error = RateLimitHandler.createMockRateLimitError();
      handler.handleRateLimit(error, 0);

      handler.resetStats();
      const stats = handler.getStats();
      
      expect(stats.totalRateLimits).toBe(0);
      expect(stats.totalRetries).toBe(0);
    });
  });

  describe('Async processing', () => {
    test('should process rate limit with delay', async () => {
      // Use a very small delay for testing
      handler.updateConfig({ baseDelay: 10, maxDelay: 100 });
      
      const error = RateLimitHandler.createMockRateLimitError();
      const startTime = Date.now();

      const result = await handler.processRateLimit(error, 0);
      const endTime = Date.now();

      expect(result.shouldRetry).toBe(true);
      expect(endTime - startTime).toBeGreaterThanOrEqual(10); // At least base delay
    });

    test('should not delay when shouldRetry is false', async () => {
      const error = RateLimitHandler.createMockRateLimitError();
      const startTime = Date.now();

      const result = await handler.processRateLimit(error, 3); // Max retries exceeded
      const endTime = Date.now();

      expect(result.shouldRetry).toBe(false);
      expect(endTime - startTime).toBeLessThan(50); // Should be immediate
    });
  });

  describe('Configuration', () => {
    test('should get current configuration', () => {
      const config = handler.getConfig();
      
      expect(config).toEqual({
        baseDelay: 1000,
        maxDelay: 10000,
        maxRetries: 3,
        jitterFactor: 0.1
      });
    });

    test('should update configuration', () => {
      handler.updateConfig({
        baseDelay: 2000,
        maxRetries: 5
      });

      const config = handler.getConfig();
      
      expect(config.baseDelay).toBe(2000);
      expect(config.maxRetries).toBe(5);
      expect(config.maxDelay).toBe(10000); // Unchanged
    });
  });

  describe('Mock error creation', () => {
    test('should create mock rate limit error', () => {
      const error = RateLimitHandler.createMockRateLimitError({
        message: 'Custom rate limit message',
        status: 429,
        retryAfter: 30
      });

      expect(error.message).toBe('Custom rate limit message');
      expect(error.status).toBe(429);
      expect(error.headers['retry-after']).toBe('30');
    });

    test('should create mock error with defaults', () => {
      const error = RateLimitHandler.createMockRateLimitError();

      expect(error.message).toBe('Rate limit exceeded');
      expect(error.status).toBe(429);
      expect(error.statusCode).toBe(429);
    });
  });
});