/**
 * Property-based tests for Groq Client
 * Feature: trade-off-referee, Property 8: Model Configuration Compliance
 * Validates: Requirements 2.3
 */

const fc = require('fast-check');
const GroqClient = require('../src/groqClient');

// Mock the groq-sdk to avoid actual API calls during testing
jest.mock('groq-sdk', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }));
});

describe('Groq Client Property Tests', () => {
  let client;
  let mockGroq;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Get the mocked Groq constructor
    const GroqMock = require('groq-sdk');
    mockGroq = {
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    };
    GroqMock.mockImplementation(() => mockGroq);
    
    // Create fresh client for each test
    client = new GroqClient('test-api-key-' + Math.random());
  });

  /**
   * Property 8: Model Configuration Compliance
   * For any API call, the system should use llama-3.3-70b-versatile as the primary model 
   * and mixtral-8x7b-instruct as the fallback model
   */
  test('Property 8: Model Configuration Compliance - Primary and fallback models are correct', () => {
    fc.assert(fc.property(fc.constant(null), () => {
      const config = client.getModelConfig();
      
      // Should use the correct primary model
      expect(config.primaryModel).toBe('llama-3.3-70b-versatile');
      
      // Should use the correct fallback model
      expect(config.fallbackModel).toBe('mixtral-8x7b-instruct');
      
      // Configuration should be consistent
      expect(config.rateLimitHandler).toBeDefined();
      expect(typeof config.rateLimitHandler.maxRetries).toBe('number');
      expect(config.rateLimitHandler.maxRetries).toBeGreaterThan(0);
      expect(typeof config.rateLimitHandler.baseDelay).toBe('number');
      expect(config.rateLimitHandler.baseDelay).toBeGreaterThan(0);
      expect(typeof config.rateLimitHandler.maxDelay).toBe('number');
      expect(config.rateLimitHandler.maxDelay).toBeGreaterThanOrEqual(config.rateLimitHandler.baseDelay);
      
    }), { numRuns: 10 });
  });

  test('Property 8a: API calls use correct model configuration', async () => {
    // Use a simple, controlled test instead of property-based for this complex async scenario
    const testPrompt = 'This is a test prompt for API configuration';
    
    // Reset mock completely
    mockGroq.chat.completions.create.mockClear();
    mockGroq.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: '{"test": "response"}' } }],
      usage: { total_tokens: 100 }
    });

    const result = await client.callAPI(testPrompt);
    
    // Should have called the API exactly once
    expect(mockGroq.chat.completions.create).toHaveBeenCalledTimes(1);
    
    // Should use primary model by default
    const callArgs = mockGroq.chat.completions.create.mock.calls[0][0];
    expect(callArgs.model).toBe('llama-3.3-70b-versatile');
    
    // Should have correct message structure
    expect(callArgs.messages).toHaveLength(1);
    expect(callArgs.messages[0].role).toBe('user');
    expect(callArgs.messages[0].content).toBe(testPrompt);
    
    // Should have appropriate parameters for free tier
    expect(callArgs.temperature).toBe(0.1);
    expect(callArgs.max_tokens).toBe(2048);
    expect(callArgs.top_p).toBe(0.9);
    expect(callArgs.stream).toBe(false);
    
    // Result should indicate success
    expect(result.success).toBe(true);
    expect(result.model).toBe('llama-3.3-70b-versatile');
    expect(result.usedFallback).toBe(false);
  });

  test('Property 8b: Configuration updates are applied correctly', () => {
    const configGen = fc.record({
      primaryModel: fc.oneof(fc.constant('llama-3.3-70b-versatile'), fc.string({ minLength: 5 })),
      fallbackModel: fc.oneof(fc.constant('mixtral-8x7b-instruct'), fc.string({ minLength: 5 })),
      rateLimitHandler: fc.record({
        maxRetries: fc.integer({ min: 1, max: 10 }),
        baseDelay: fc.integer({ min: 100, max: 5000 }),
        maxDelay: fc.integer({ min: 5000, max: 60000 })
      }, { requiredKeys: [] })
    }, { requiredKeys: [] });

    fc.assert(fc.property(configGen, (newConfig) => {
      const originalConfig = client.getModelConfig();
      
      client.updateConfig(newConfig);
      const updatedConfig = client.getModelConfig();
      
      // Check that specified fields were updated
      if (newConfig.primaryModel !== undefined) {
        expect(updatedConfig.primaryModel).toBe(newConfig.primaryModel);
      } else {
        expect(updatedConfig.primaryModel).toBe(originalConfig.primaryModel);
      }
      
      if (newConfig.fallbackModel !== undefined) {
        expect(updatedConfig.fallbackModel).toBe(newConfig.fallbackModel);
      } else {
        expect(updatedConfig.fallbackModel).toBe(originalConfig.fallbackModel);
      }
      
      if (newConfig.rateLimitHandler) {
        if (newConfig.rateLimitHandler.maxRetries !== undefined) {
          expect(updatedConfig.rateLimitHandler.maxRetries).toBe(newConfig.rateLimitHandler.maxRetries);
        } else {
          expect(updatedConfig.rateLimitHandler.maxRetries).toBe(originalConfig.rateLimitHandler.maxRetries);
        }
        
        if (newConfig.rateLimitHandler.baseDelay !== undefined) {
          expect(updatedConfig.rateLimitHandler.baseDelay).toBe(newConfig.rateLimitHandler.baseDelay);
        } else {
          expect(updatedConfig.rateLimitHandler.baseDelay).toBe(originalConfig.rateLimitHandler.baseDelay);
        }
        
        if (newConfig.rateLimitHandler.maxDelay !== undefined) {
          expect(updatedConfig.rateLimitHandler.maxDelay).toBe(newConfig.rateLimitHandler.maxDelay);
        } else {
          expect(updatedConfig.rateLimitHandler.maxDelay).toBe(originalConfig.rateLimitHandler.maxDelay);
        }
      }
      
    }), { numRuns: 20 });
  });

  test('Property 8c: Response validation is consistent', () => {
    const responseGen = fc.oneof(
      // Valid JSON responses
      fc.record({
        test: fc.string(),
        number: fc.integer(),
        boolean: fc.boolean()
      }).map(obj => JSON.stringify(obj)),
      
      // Invalid responses
      fc.string().filter(s => {
        try {
          JSON.parse(s);
          return false; // Skip valid JSON
        } catch {
          return true; // Keep invalid JSON
        }
      }),
      
      // Edge cases
      fc.constantFrom('', 'null', 'undefined', '{}', '[]')
    );

    fc.assert(fc.property(responseGen, (response) => {
      const result = client.validateResponse(response);
      
      expect(result).toHaveProperty('valid');
      expect(typeof result.valid).toBe('boolean');
      
      if (result.valid) {
        expect(result).toHaveProperty('data');
        expect(result.data).toBeDefined();
      } else {
        expect(result).toHaveProperty('error');
        expect(typeof result.error).toBe('string');
        expect(result.error.length).toBeGreaterThan(0);
      }
      
    }), { numRuns: 50 });
  });

  test('Property 8d: Statistics tracking is consistent', () => {
    fc.assert(fc.property(fc.constant(null), () => {
      const stats = client.getStats();
      
      // All statistics should be numbers
      expect(typeof stats.totalCalls).toBe('number');
      expect(typeof stats.successfulCalls).toBe('number');
      expect(typeof stats.failedCalls).toBe('number');
      expect(typeof stats.rateLimitHits).toBe('number');
      expect(typeof stats.fallbackUsed).toBe('number');
      expect(typeof stats.totalRetries).toBe('number');
      expect(typeof stats.successRate).toBe('number');
      expect(typeof stats.fallbackRate).toBe('number');
      expect(typeof stats.averageRetriesPerCall).toBe('number');
      
      // Statistics should be non-negative
      expect(stats.totalCalls).toBeGreaterThanOrEqual(0);
      expect(stats.successfulCalls).toBeGreaterThanOrEqual(0);
      expect(stats.failedCalls).toBeGreaterThanOrEqual(0);
      expect(stats.rateLimitHits).toBeGreaterThanOrEqual(0);
      expect(stats.fallbackUsed).toBeGreaterThanOrEqual(0);
      expect(stats.totalRetries).toBeGreaterThanOrEqual(0);
      
      // Rates should be between 0 and 100
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeLessThanOrEqual(100);
      expect(stats.fallbackRate).toBeGreaterThanOrEqual(0);
      expect(stats.fallbackRate).toBeLessThanOrEqual(100);
      
      // Logical consistency
      expect(stats.successfulCalls + stats.failedCalls).toBeLessThanOrEqual(stats.totalCalls);
      expect(stats.fallbackUsed).toBeLessThanOrEqual(stats.totalCalls);
      expect(stats.rateLimitHits).toBeLessThanOrEqual(stats.failedCalls);
      
    }), { numRuns: 10 });
  });

  test('Property 8e: Error handling for invalid inputs', async () => {
    const invalidInputs = ['', null, undefined, 0, true, []];
    
    for (const invalidInput of invalidInputs) {
      try {
        await client.callAPI(invalidInput);
        // If we get here, the call didn't throw - this is unexpected
        fail(`Expected error for input: ${JSON.stringify(invalidInput)}`);
      } catch (error) {
        // This is expected - invalid inputs should throw
        expect(error.message).toContain('Prompt must be a non-empty string');
      }
    }
  });

  test('Property 8f: Initialization requirements', () => {
    const apiKeyGen = fc.oneof(
      fc.string({ minLength: 1 }), // Valid API keys
      fc.constantFrom('', null, undefined) // Invalid API keys
    );

    fc.assert(fc.property(apiKeyGen, (apiKey) => {
      if (!apiKey) {
        // Should throw error for missing/empty API key
        expect(() => new GroqClient(apiKey)).toThrow('Groq API key is required');
      } else {
        // Should initialize successfully with valid API key
        const testClient = new GroqClient(apiKey);
        expect(testClient).toBeDefined();
        expect(testClient.getModelConfig().primaryModel).toBe('llama-3.3-70b-versatile');
        expect(testClient.getModelConfig().fallbackModel).toBe('mixtral-8x7b-instruct');
      }
      
    }), { numRuns: 20 });
  });

  /**
   * Property 7: Rate Limit Handling
   * For any 429 rate limit response from the API, the system should implement 
   * exponential backoff retry logic and attempt fallback to the secondary model
   */
  test('Property 7: Rate Limit Handling - Exponential backoff and fallback behavior', async () => {
    const testPrompt = 'Test prompt for rate limit handling';
    
    // Mock rate limit error (429)
    const rateLimitError = new Error('Rate limit exceeded');
    rateLimitError.status = 429;
    rateLimitError.headers = { 'retry-after': '2' };
    
    mockGroq.chat.completions.create
      .mockRejectedValueOnce(rateLimitError) // First call fails with rate limit
      .mockRejectedValueOnce(rateLimitError) // Second call also fails
      .mockResolvedValueOnce({ // Third call succeeds
        choices: [{ message: { content: '{"test": "response"}' } }],
        usage: { total_tokens: 100 }
      });

    const startTime = Date.now();
    const result = await client.callAPI(testPrompt);
    const endTime = Date.now();
    
    // Should have eventually succeeded
    expect(result.success).toBe(true);
    
    // Should have taken some time due to backoff delays
    expect(endTime - startTime).toBeGreaterThan(1000); // At least 1 second delay
    
    // Should have made multiple attempts
    expect(mockGroq.chat.completions.create).toHaveBeenCalledTimes(3);
    
    // Statistics should reflect rate limit hits and retries
    const stats = client.getStats();
    expect(stats.rateLimitHits).toBeGreaterThan(0);
    expect(stats.totalRetries).toBeGreaterThan(0);
  });

  test('Property 7a: Fallback model usage on primary model failure', async () => {
    const testPrompt = 'Test prompt for fallback model';
    
    // Mock primary model failure
    const serviceError = new Error('Service unavailable');
    serviceError.status = 503;
    
    mockGroq.chat.completions.create
      .mockRejectedValueOnce(serviceError) // Primary model fails
      .mockResolvedValueOnce({ // Fallback model succeeds
        choices: [{ message: { content: '{"test": "fallback response"}' } }],
        usage: { total_tokens: 100 }
      });

    const result = await client.callAPI(testPrompt);
    
    // Should have succeeded using fallback
    expect(result.success).toBe(true);
    expect(result.usedFallback).toBe(true);
    expect(result.model).toBe('mixtral-8x7b-instruct');
    
    // Should have made 2 calls (primary + fallback)
    expect(mockGroq.chat.completions.create).toHaveBeenCalledTimes(2);
    
    // First call should use primary model
    const firstCall = mockGroq.chat.completions.create.mock.calls[0][0];
    expect(firstCall.model).toBe('llama-3.3-70b-versatile');
    
    // Second call should use fallback model
    const secondCall = mockGroq.chat.completions.create.mock.calls[1][0];
    expect(secondCall.model).toBe('mixtral-8x7b-instruct');
    
    // Statistics should reflect fallback usage
    const stats = client.getStats();
    expect(stats.fallbackUsed).toBeGreaterThan(0);
  });

  test('Property 7b: Backoff delay calculation is consistent', () => {
    // Test the rate limit handler's backoff calculation logic
    const retryCountGen = fc.integer({ min: 0, max: 5 });
    
    fc.assert(fc.property(retryCountGen, (retryCount) => {
      // Create a test client to access rate limit handler
      const testClient = new GroqClient('test-key');
      const rateLimitHandler = testClient.rateLimitHandler;
      
      // Mock error without retry-after header
      const error = { status: 429 };
      const delay = rateLimitHandler.calculateBackoffDelay(retryCount, error);
      
      // Delay should be a positive number
      expect(typeof delay).toBe('number');
      expect(delay).toBeGreaterThan(0);
      
      // Delay should not exceed max delay
      const config = rateLimitHandler.getConfig();
      expect(delay).toBeLessThanOrEqual(config.maxDelay);
      
      // Delay should generally increase with retry count (exponential backoff)
      if (retryCount > 0) {
        const previousDelay = rateLimitHandler.calculateBackoffDelay(retryCount - 1, error);
        // Allow some variance due to jitter, but should generally be larger
        expect(delay).toBeGreaterThanOrEqual(previousDelay * 0.8);
      }
      
    }), { numRuns: 20 });
  });

  test('Property 7c: Retry-after header is respected', async () => {
    const testPrompt = 'Test prompt for retry-after header';
    
    // Mock rate limit error with retry-after header
    const rateLimitError = new Error('Rate limit exceeded');
    rateLimitError.status = 429;
    rateLimitError.headers = { 'retry-after': '1' }; // 1 second
    
    mockGroq.chat.completions.create
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce({
        choices: [{ message: { content: '{"test": "response"}' } }],
        usage: { total_tokens: 100 }
      });

    const startTime = Date.now();
    const result = await client.callAPI(testPrompt);
    const endTime = Date.now();
    
    // Should have succeeded
    expect(result.success).toBe(true);
    
    // Should have waited at least the retry-after time
    expect(endTime - startTime).toBeGreaterThanOrEqual(1000); // At least 1 second
    
    // Should have made 2 calls
    expect(mockGroq.chat.completions.create).toHaveBeenCalledTimes(2);
  });

  test('Property 7d: Max retries are respected', async () => {
    const testPrompt = 'Test prompt for max retries';
    
    // Configure client with low max retries for testing
    client.updateConfig({ 
      rateLimitHandler: { 
        maxRetries: 2 
      } 
    });
    
    // Mock persistent rate limit errors
    const rateLimitError = new Error('Rate limit exceeded');
    rateLimitError.status = 429;
    
    mockGroq.chat.completions.create.mockRejectedValue(rateLimitError);

    const result = await client.callAPI(testPrompt);
    
    // Should have failed after max retries
    expect(result.success).toBe(false);
    expect(result.error).toContain('Rate limit exceeded');
    
    // Should have made exactly maxRetries + 1 calls (initial + retries)
    expect(mockGroq.chat.completions.create).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    
    // Statistics should reflect the failures
    const stats = client.getStats();
    expect(stats.rateLimitHits).toBeGreaterThan(0);
    expect(stats.failedCalls).toBeGreaterThan(0);
  });
});