/**
 * Integration tests for Express server
 * Tests the /compare endpoint and error handling
 */

const request = require('supertest');
const TradeOffServer = require('../src/server');

describe('TradeOffServer', () => {
  let server;
  let app;

  beforeAll(async () => {
    // Use a test API key (will fail API calls but test structure)
    server = new TradeOffServer({
      apiKey: 'test-api-key',
      port: 0, // Use random port for testing
      cacheFile: './cache/test-cache.json'
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

  describe('Health endpoints', () => {
    test('GET /health should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('stats');
    });

    test('GET /api/info should return API information', async () => {
      const response = await request(app)
        .get('/api/info')
        .expect(200);

      expect(response.body).toHaveProperty('name', 'Trade-Off Referee API');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body).toHaveProperty('models');
      expect(response.body).toHaveProperty('limits');
    });
  });

  describe('POST /api/compare', () => {
    test('should return 400 for missing question', async () => {
      const response = await request(app)
        .post('/api/compare')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', true);
      expect(response.body).toHaveProperty('message', 'Validation failed');
      expect(response.body).toHaveProperty('details');
      expect(Array.isArray(response.body.details)).toBe(true);
    });

    test('should return 400 for invalid question (too short)', async () => {
      const response = await request(app)
        .post('/api/compare')
        .send({ question: 'short' })
        .expect(400);

      expect(response.body).toHaveProperty('error', true);
      expect(response.body).toHaveProperty('details');
    });

    test('should return 400 for invalid question (too long)', async () => {
      const longQuestion = 'a'.repeat(501);
      const response = await request(app)
        .post('/api/compare')
        .send({ question: longQuestion })
        .expect(400);

      expect(response.body).toHaveProperty('error', true);
      expect(response.body).toHaveProperty('details');
    });

    test('should handle valid question structure (will fail API call with test key)', async () => {
      const response = await request(app)
        .post('/api/compare')
        .send({ question: 'Should I use React or Vue for my new project?' })
        .expect(401); // Will fail with authentication error due to test API key

      expect(response.body).toHaveProperty('error', true);
      expect(response.body).toHaveProperty('code', 'AUTHENTICATION_ERROR');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('POST /api/validate', () => {
    test('should validate question without processing', async () => {
      const response = await request(app)
        .post('/api/validate')
        .send({ question: 'Should I use React or Vue for my project?' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('validation');
      expect(response.body.validation).toHaveProperty('valid', true);
      expect(response.body.validation).toHaveProperty('isDecisionOriented');
      expect(response.body).toHaveProperty('cacheInfo');
    });
  });

  describe('Error handling', () => {
    test('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown-route')
        .expect(404);

      expect(response.body).toHaveProperty('error', true);
      expect(response.body).toHaveProperty('code', 'NOT_FOUND');
      expect(response.body).toHaveProperty('availableEndpoints');
    });

    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/compare')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body).toHaveProperty('error', true);
      expect(response.body).toHaveProperty('details');
    });
  });

  describe('Security headers', () => {
    test('should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
      expect(response.headers).toHaveProperty('x-xss-protection', '1; mode=block');
      expect(response.headers).toHaveProperty('referrer-policy', 'strict-origin-when-cross-origin');
    });

    test('should include response time header', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-response-time');
      expect(response.headers['x-response-time']).toMatch(/^\d+ms$/);
    });
  });
});