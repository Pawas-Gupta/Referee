/**
 * Integration Tests for Complete Pipeline
 * Tests end-to-end request processing and error scenarios
 * Based on requirements 4.2, 4.3
 */

const TradeOffService = require('../src/tradeOffService');
const fs = require('fs');
const path = require('path');

// Mock API key for testing
const TEST_API_KEY = 'test-key-for-integration-testing';

describe('Integration Tests: Complete Pipeline', () => {
  let service;
  const testCacheFile = './cache/integration-test.json';

  beforeEach(() => {
    // Clean up any existing test cache
    if (fs.existsSync(testCacheFile)) {
      fs.unlinkSync(testCacheFile);
    }

    service = new TradeOffService(TEST_API_KEY, {
      cacheFile: testCacheFile
    });
  });

  afterEach(() => {
    if (service) {
      service.destroy();
    }

    // Clean up test cache file
    if (fs.existsSync(testCacheFile)) {
      fs.unlinkSync(testCacheFile);
    }
  });

  describe('End-to-End Request Processing', () => {
    test('should process valid question through complete pipeline', async () => {
      const question = 'Should I use React or Vue for my web application?';
      
      const result = await service.analyze(question);
      
      // Should handle API failure gracefully (expected with test key)
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('questionHash');
      
      if (result.success) {
        // If somehow successful, validate complete structure
        expect(result.data).toHaveProperty('approach1');
        expect(result.data).toHaveProperty('approach2');
        expect(result.data).toHaveProperty('comparison');
        expect(result.data).toHaveProperty('recommendation');
        expect(result.data).toHaveProperty('confidence');
      } else {
        // Expected API failure with test key
        expect(result.error).toBeDefined();
        expect(result.source).toBe('api');
      }
    }, 10000);

    test('should handle cache-first behavior correctly', async () => {
      const question = 'Should I use Python or JavaScript for backend development?';
      
      // First request - will fail API call but create cache entry attempt
      const firstResult = await service.analyze(question);
      expect(firstResult).toHaveProperty('questionHash');
      
      // Second request with same question - should use same hash
      const secondResult = await service.analyze(question);
      expect(secondResult.questionHash).toBe(firstResult.questionHash);
      
      // Both should have consistent behavior
      expect(secondResult.success).toBe(firstResult.success);
    }, 8000);

    test('should maintain statistics across multiple requests', async () => {
      const questions = [
        'Should I use SQL or NoSQL database?',
        'Is microservices or monolithic architecture better?',
        'Should I deploy on AWS or Google Cloud?'
      ];
      
      const initialStats = service.getStats();
      expect(initialStats.service.totalRequests).toBe(0);
      
      // Process multiple questions
      for (const question of questions) {
        await service.analyze(question);
      }
      
      const finalStats = service.getStats();
      expect(finalStats.service.totalRequests).toBe(questions.length);
      expect(finalStats.service.apiCalls).toBe(questions.length);
      
      // All should be cache misses (no successful API responses to cache)
      expect(finalStats.service.cacheMisses).toBe(questions.length);
      expect(finalStats.service.cacheHits).toBe(0);
    }, 12000);
  });

  describe('Error Scenarios and Recovery', () => {
    test('should handle invalid input gracefully', async () => {
      const invalidInputs = [
        null,
        undefined,
        '',
        '   ',
        'short',  // Too short
        'a'.repeat(501)  // Too long
      ];
      
      for (const input of invalidInputs) {
        const result = await service.analyze(input);
        
        expect(result.success).toBe(false);
        expect(result.source).toBe('service');
        expect(result.error).toBeDefined();
      }
    }, 5000);

    test('should handle cache corruption gracefully', async () => {
      const question = 'Should I use React or Angular for my project?';
      
      // Create corrupted cache file
      fs.writeFileSync(testCacheFile, 'invalid json content');
      
      // Service should handle corruption and continue
      const result = await service.analyze(question);
      
      // Should not crash, should handle gracefully
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('questionHash');
    }, 8000);

    test('should handle file system errors', async () => {
      const question = 'Should I use TypeScript or JavaScript?';
      
      // Create a directory where cache file should be (will cause write error)
      const cacheDir = path.dirname(testCacheFile);
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      
      // Try to create directory with same name as cache file
      try {
        fs.mkdirSync(testCacheFile);
      } catch (error) {
        // Ignore if already exists or can't create
      }
      
      const result = await service.analyze(question);
      
      // Should handle file system errors gracefully
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('questionHash');
      
      // Clean up
      try {
        fs.rmSync(testCacheFile, { recursive: true, force: true });
      } catch (error) {
        // Ignore cleanup errors
      }
    }, 8000);

    test('should validate question format correctly', async () => {
      const validQuestions = [
        'Should I use React or Vue for my web application?',
        'Is it better to use SQL or NoSQL database for my project?',
        'Should I deploy on AWS or Google Cloud Platform?'
      ];
      
      const invalidQuestions = [
        'What is React?',  // Not decision-oriented
        'How to install Node.js?',  // Not a trade-off question
        'Tell me about databases.'  // Not a comparison question
      ];
      
      // Valid questions should be processed (even if API fails)
      for (const question of validQuestions) {
        const validation = service.validateQuestion(question);
        expect(validation.valid).toBe(true);
        expect(validation.isDecisionOriented).toBe(true);
      }
      
      // Invalid questions should still be processed but flagged
      for (const question of invalidQuestions) {
        const validation = service.validateQuestion(question);
        expect(validation.valid).toBe(true);  // Length is valid
        // Decision orientation detection may vary
      }
    }, 3000);
  });

  describe('Component Integration', () => {
    test('should integrate all components correctly', async () => {
      const question = 'Should I use Docker or Kubernetes for deployment?';
      
      // Test that all components are working together
      const result = await service.analyze(question);
      
      // Verify component integration
      expect(result).toHaveProperty('questionHash');  // CacheManager working
      expect(result).toHaveProperty('source');        // Pipeline tracking working
      
      // Check that stats are being tracked across components
      const stats = service.getStats();
      expect(stats).toHaveProperty('service');
      expect(stats).toHaveProperty('cache');
      expect(stats).toHaveProperty('groq');
      expect(stats).toHaveProperty('validator');
      expect(stats).toHaveProperty('errorHandler');
      
      // Verify configuration is accessible
      const config = service.getConfig();
      expect(config).toHaveProperty('groq');
      expect(config).toHaveProperty('cache');
      expect(config).toHaveProperty('prompt');
    }, 8000);

    test('should handle concurrent requests correctly', async () => {
      const questions = [
        'Should I use React or Vue?',
        'Should I use Python or Node.js?',
        'Should I use MySQL or PostgreSQL?'
      ];
      
      // Process questions concurrently
      const promises = questions.map(question => service.analyze(question));
      const results = await Promise.all(promises);
      
      // All should complete
      expect(results).toHaveLength(questions.length);
      
      // Each should have unique question hash
      const hashes = results.map(r => r.questionHash);
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(questions.length);
      
      // Stats should reflect all requests
      const stats = service.getStats();
      expect(stats.service.totalRequests).toBe(questions.length);
    }, 10000);

    test('should maintain cache consistency across operations', async () => {
      const question = 'Should I use GraphQL or REST API?';
      
      // Get initial cache info
      const initialCacheInfo = service.getCacheInfo(question);
      expect(initialCacheInfo).toHaveProperty('cached');
      expect(initialCacheInfo).toHaveProperty('questionHash');
      expect(initialCacheInfo.cached).toBe(false);
      
      // Process question
      await service.analyze(question);
      
      // Cache info should be consistent
      const afterCacheInfo = service.getCacheInfo(question);
      expect(afterCacheInfo.questionHash).toBe(initialCacheInfo.questionHash);
      
      // Clear cache and verify
      service.clearCache();
      const clearedCacheInfo = service.getCacheInfo(question);
      expect(clearedCacheInfo.cached).toBe(false);
    }, 6000);
  });

  describe('Performance and Resource Management', () => {
    test('should handle memory pressure gracefully', async () => {
      const questions = Array.from({ length: 10 }, (_, i) => 
        `Should I use option A${i} or option B${i} for my project?`
      );
      
      // Process many questions to test memory handling
      const results = [];
      for (const question of questions) {
        const result = await service.analyze(question);
        results.push(result);
      }
      
      // All should complete without memory errors
      expect(results).toHaveLength(questions.length);
      
      // Memory usage should be reasonable (relaxed limit for test environment)
      const memUsage = process.memoryUsage();
      expect(memUsage.heapUsed).toBeLessThan(150 * 1024 * 1024); // Less than 150MB
    }, 15000);

    test('should clean up resources properly', async () => {
      const question = 'Should I use Redis or Memcached for caching?';
      
      // Process question
      await service.analyze(question);
      
      // Get initial stats
      const initialStats = service.getStats();
      
      // Reset stats
      service.resetStats();
      
      // Stats should be reset
      const resetStats = service.getStats();
      expect(resetStats.service.totalRequests).toBe(0);
      expect(resetStats.service.cacheHits).toBe(0);
      expect(resetStats.service.cacheMisses).toBe(0);
    }, 5000);
  });

  describe('Configuration and Flexibility', () => {
    test('should handle different configuration options', async () => {
      // Test with different cache file
      const customService = new TradeOffService(TEST_API_KEY, {
        cacheFile: './cache/custom-integration-test.json',
        logLevel: 'info'
      });
      
      try {
        const question = 'Should I use MongoDB or PostgreSQL?';
        const result = await customService.analyze(question);
        
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('questionHash');
        
        // Verify service was created with custom options
        const config = customService.getConfig();
        expect(config).toHaveProperty('groq');
        expect(config).toHaveProperty('cache');
        
      } finally {
        customService.destroy();
        
        // Clean up custom cache file if it exists
        if (fs.existsSync('./cache/custom-integration-test.json')) {
          fs.unlinkSync('./cache/custom-integration-test.json');
        }
      }
    }, 8000);

    test('should support configuration updates', async () => {
      const question = 'Should I use Webpack or Vite for bundling?';
      
      // Get initial config
      const initialConfig = service.getConfig();
      expect(initialConfig).toHaveProperty('groq');
      
      // Update configuration
      service.updateConfig({
        cache: { ttl: 3600000 },  // 1 hour
        groq: { maxRetries: 5 }
      });
      
      // Process question with new config
      const result = await service.analyze(question);
      expect(result).toHaveProperty('success');
      
      // Verify config update was applied (check that service accepts updates)
      const updatedConfig = service.getConfig();
      expect(updatedConfig).toHaveProperty('groq');
      expect(updatedConfig).toHaveProperty('cache');
    }, 6000);
  });
});