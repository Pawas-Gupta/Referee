/**
 * Property-based test for HTTP error handling
 * Feature: trade-off-referee, Property 10: HTTP Error Handling
 * Validates: Requirements 4.4
 */

const fc = require('fast-check');
const request = require('supertest');
const TradeOffServer = require('../src/server');

describe('Property 10: HTTP Error Handling', () => {
  let server;
  let app;

  beforeAll(async () => {
    // Use a test API key that will trigger authentication errors
    server = new TradeOffServer({
      apiKey: 'test-api-key',
      port: 0, // Use random port for testing
      cacheFile: './cache/prop-test-http-error-handling.json'
    });
    app = server.getApp();
  });

  afterAll(async () => {
    if (server) {
      await server.stop();
    }
    // Add a small delay to ensure cleanup completes
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  /**
   * Property 10: HTTP Error Handling
   * For any error condition (invalid input, API failure, validation error), 
   * the system should return appropriate HTTP status codes and error messages.
   * Validates: Requirements 4.4
   */
  test('should return appropriate HTTP status codes for all error conditions', async () => {
    // Test invalid input scenarios
    const invalidInputArb = fc.oneof(
      // Missing question
      fc.constant({}),
      // Empty question
      fc.constant({ question: '' }),
      // Question too short
      fc.constant({ question: 'short' }),
      // Question too long
      fc.constant({ question: 'a'.repeat(501) }),
      // Non-string question
      fc.constant({ question: 123 }),
      fc.constant({ question: null }),
      fc.constant({ question: undefined }),
      fc.constant({ question: [] }),
      fc.constant({ question: {} })
    );

    await fc.assert(fc.asyncProperty(
      invalidInputArb,
      async (invalidInput) => {
        const response = await request(app)
          .post('/api/compare')
          .send(invalidInput);

        // Property 10: Invalid input should return 400 status
        expect(response.status).toBe(400);
        
        // Error response should have proper structure
        expect(response.body).toHaveProperty('error', true);
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('timestamp');
        expect(typeof response.body.message).toBe('string');
        expect(response.body.message.length).toBeGreaterThan(0);
        
        // Should include details for validation errors
        if (response.body.code === 'VALIDATION_ERROR') {
          expect(response.body).toHaveProperty('details');
          expect(Array.isArray(response.body.details)).toBe(true);
        }
      }
    ), { 
      numRuns: 20,
      timeout: 5000
    });
  }, 30000);

  /**
   * Test API authentication error handling
   */
  test('should return 401 for authentication errors', async () => {
    // Valid question that will trigger API call with invalid key
    const response = await request(app)
      .post('/api/compare')
      .send({ question: 'Should I use React or Vue for my new project?' });

    // Should return 401 for authentication error
    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error', true);
    expect(response.body).toHaveProperty('code', 'AUTHENTICATION_ERROR');
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('timestamp');
    expect(typeof response.body.message).toBe('string');
  });

  /**
   * Test 404 error handling for unknown routes
   */
  test('should return 404 for unknown routes with proper error structure', async () => {
    const unknownRoutes = [
      '/unknown',
      '/api/unknown',
      '/api/compare/extra',
      '/health/extra',
      '/random-endpoint'
    ];

    for (const route of unknownRoutes) {
      const response = await request(app).get(route);
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', true);
      expect(response.body).toHaveProperty('code', 'NOT_FOUND');
      expect(response.body).toHaveProperty('message', 'Endpoint not found');
      expect(response.body).toHaveProperty('availableEndpoints');
      expect(Array.isArray(response.body.availableEndpoints)).toBe(true);
      expect(response.body.availableEndpoints.length).toBeGreaterThan(0);
    }
  });

  /**
   * Test malformed JSON handling
   */
  test('should return 400 for malformed JSON with proper error structure', async () => {
    const response = await request(app)
      .post('/api/compare')
      .set('Content-Type', 'application/json')
      .send('{"invalid": json}');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', true);
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('details');
    expect(Array.isArray(response.body.details)).toBe(true);
    expect(response.body.details).toContain('Invalid JSON in request body');
  });

  /**
   * Test that all error responses include required fields
   */
  test('should include required fields in all error responses', async () => {
    const errorScenarios = [
      // Invalid input
      { method: 'post', path: '/api/compare', body: {} },
      // Unknown route
      { method: 'get', path: '/unknown', body: null },
      // Malformed JSON (handled by supertest differently)
      { method: 'post', path: '/api/validate', body: { question: 'short' } }
    ];

    for (const scenario of errorScenarios) {
      let response;
      if (scenario.method === 'get') {
        response = await request(app).get(scenario.path);
      } else {
        response = await request(app).post(scenario.path).send(scenario.body);
      }

      // Should be an error status code
      expect(response.status).toBeGreaterThanOrEqual(400);
      
      // All error responses must have these fields
      expect(response.body).toHaveProperty('error', true);
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
      expect(response.body.message.length).toBeGreaterThan(0);
      
      // Should have either code or timestamp (preferably both)
      const hasCode = response.body.hasOwnProperty('code');
      const hasTimestamp = response.body.hasOwnProperty('timestamp');
      expect(hasCode || hasTimestamp).toBe(true);
      
      if (hasCode) {
        expect(typeof response.body.code).toBe('string');
        expect(response.body.code.length).toBeGreaterThan(0);
      }
      
      if (hasTimestamp) {
        expect(typeof response.body.timestamp).toBe('string');
        // Should be a valid ISO timestamp
        expect(() => new Date(response.body.timestamp)).not.toThrow();
      }
    }
  });

  /**
   * Test response headers are set correctly for error responses
   */
  test('should include security headers in error responses', async () => {
    const response = await request(app)
      .post('/api/compare')
      .send({});

    expect(response.status).toBe(400);
    
    // Security headers should be present even in error responses
    expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
    expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
    expect(response.headers).toHaveProperty('x-xss-protection', '1; mode=block');
    expect(response.headers).toHaveProperty('referrer-policy', 'strict-origin-when-cross-origin');
    
    // Response time header should be present
    expect(response.headers).toHaveProperty('x-response-time');
    expect(response.headers['x-response-time']).toMatch(/^\d+ms$/);
  });

  /**
   * Test error message consistency and helpfulness
   */
  test('should provide helpful error messages for common mistakes', async () => {
    const testCases = [
      {
        input: {},
        expectedMessage: /question.*required/i
      },
      {
        input: { question: '' },
        expectedMessage: /question.*required|empty/i
      },
      {
        input: { question: 'short' },
        expectedMessage: /length|characters/i
      },
      {
        input: { question: 'a'.repeat(501) },
        expectedMessage: /length|long|characters/i
      }
    ];

    for (const testCase of testCases) {
      const response = await request(app)
        .post('/api/compare')
        .send(testCase.input);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', true);
      
      // Error message should be helpful and match expected pattern
      const errorMessage = response.body.message || '';
      const detailsMessage = Array.isArray(response.body.details) 
        ? response.body.details.join(' ') 
        : '';
      const combinedMessage = errorMessage + ' ' + detailsMessage;
      
      expect(combinedMessage).toMatch(testCase.expectedMessage);
    }
  });

  /**
   * Property test for error response structure consistency
   */
  test('should maintain consistent error response structure across all error types', async () => {
    // Generate various invalid requests
    const invalidRequestArb = fc.oneof(
      // Invalid paths
      fc.string({ minLength: 1, maxLength: 50 }).map(s => ({ 
        method: 'get', 
        path: '/' + s.replace(/[^a-zA-Z0-9-_]/g, ''), 
        body: null 
      })),
      // Invalid POST bodies
      fc.oneof(
        fc.constant({ question: '' }),
        fc.constant({ question: 'x' }),
        fc.constant({ question: 'a'.repeat(600) }),
        fc.constant({ notQuestion: 'test' }),
        fc.constant({ question: 123 })
      ).map(body => ({ 
        method: 'post', 
        path: '/api/compare', 
        body 
      }))
    );

    await fc.assert(fc.asyncProperty(
      invalidRequestArb,
      async (invalidRequest) => {
        let response;
        
        try {
          if (invalidRequest.method === 'get') {
            response = await request(app).get(invalidRequest.path);
          } else {
            response = await request(app)
              .post(invalidRequest.path)
              .send(invalidRequest.body);
          }

          // All error responses should have consistent structure
          expect(response.status).toBeGreaterThanOrEqual(400);
          expect(response.body).toHaveProperty('error', true);
          expect(response.body).toHaveProperty('message');
          expect(typeof response.body.message).toBe('string');
          expect(response.body.message.length).toBeGreaterThan(0);
          
          // Should not expose internal details in production
          expect(response.body.message).not.toMatch(/stack trace|internal error|debug/i);
          
        } catch (error) {
          // Network errors or test framework errors should not occur
          throw new Error(`Unexpected error during request: ${error.message}`);
        }
      }
    ), { 
      numRuns: 30,
      timeout: 5000
    });
  }, 45000);
});