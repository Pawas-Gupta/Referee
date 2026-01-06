/**
 * Property-based tests for Cache Manager
 * Feature: trade-off-referee, Property 4: Cache-First Behavior
 * Validates: Requirements 3.3, 3.4, 4.5
 */

const fc = require('fast-check');
const fs = require('fs');
const path = require('path');
const CacheManager = require('../src/cacheManager');

describe('Cache Manager Property Tests', () => {
  let cache;
  let testCacheFile;

  beforeEach(() => {
    // Use unique cache file for each test
    testCacheFile = `./cache/test-cache-${Date.now()}-${Math.random()}.json`;
    cache = new CacheManager(testCacheFile);
    
    // Ensure clean state
    cache.clear();
  });

  afterEach(() => {
    // Cleanup
    if (cache) {
      cache.destroy();
    }
    
    // Remove test cache file
    try {
      if (fs.existsSync(testCacheFile)) {
        fs.unlinkSync(testCacheFile);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  /**
   * Property 4: Cache-First Behavior
   * For any identical question asked multiple times, the second and subsequent 
   * requests should return cached responses without making new API calls
   */
  test('Property 4: Cache-First Behavior - Identical questions return cached responses', () => {
    const questionGen = fc.string({ minLength: 10, maxLength: 200 });
    const responseGen = fc.record({
      problem_summary: fc.string(),
      primary_approach: fc.record({
        title: fc.string(),
        description: fc.string(),
        pros: fc.array(fc.string()),
        cons: fc.array(fc.string()),
        tradeoffs: fc.string()
      }),
      alternative_approach: fc.record({
        title: fc.string(),
        description: fc.string(),
        pros: fc.array(fc.string()),
        cons: fc.array(fc.string()),
        tradeoffs: fc.string()
      }),
      when_to_choose: fc.record({
        choose_primary_if: fc.array(fc.string()),
        choose_alternative_if: fc.array(fc.string())
      }),
      optional_hybrid_strategy: fc.string(),
      final_recommendation: fc.string()
    });

    fc.assert(fc.property(questionGen, responseGen, (question, response) => {
      // Create a fresh cache for this test run to ensure clean state
      const freshCache = new CacheManager(`./cache/prop-test-${Date.now()}-${Math.random()}.json`);
      
      // Generate hash for the question
      const hash = freshCache.generateHash(question);
      
      // First request - should be a cache miss
      const firstResult = freshCache.get(hash);
      expect(firstResult).toBeNull();
      
      // Store response in cache
      freshCache.set(hash, response);
      
      // Second request - should be a cache hit
      const secondResult = freshCache.get(hash);
      expect(secondResult).not.toBeNull();
      expect(secondResult).toEqual(response);
      
      // Third request - should also be a cache hit
      const thirdResult = freshCache.get(hash);
      expect(thirdResult).not.toBeNull();
      expect(thirdResult).toEqual(response);
      
      // All cached results should be identical
      expect(secondResult).toEqual(thirdResult);
      
      // Statistics should reflect cache behavior
      const stats = freshCache.getStats();
      expect(stats.hits).toBe(2); // Exactly 2 hits
      expect(stats.misses).toBe(1); // Exactly 1 miss
      expect(stats.sets).toBe(1); // Exactly 1 set
      
      // Cleanup fresh cache
      freshCache.destroy();
      
    }), { numRuns: 50 });
  });

  test('Property 4a: Hash generation is consistent and deterministic', () => {
    const questionGen = fc.string({ minLength: 1, maxLength: 500 });

    fc.assert(fc.property(questionGen, (question) => {
      const hash1 = cache.generateHash(question);
      const hash2 = cache.generateHash(question);
      
      // Same question should produce same hash
      expect(hash1).toBe(hash2);
      
      // Hash should be a string
      expect(typeof hash1).toBe('string');
      
      // Hash should have consistent length (SHA-256 = 64 hex chars)
      expect(hash1.length).toBe(64);
      
      // Hash should only contain hex characters
      expect(/^[a-f0-9]+$/.test(hash1)).toBe(true);
      
    }), { numRuns: 100 });
  });

  test('Property 4b: Case and whitespace normalization', () => {
    const baseQuestionGen = fc.string({ minLength: 10, maxLength: 100 })
      .filter(s => s.trim().length >= 10);

    fc.assert(fc.property(baseQuestionGen, (baseQuestion) => {
      // Create variations with different case and whitespace
      const variations = [
        baseQuestion,
        baseQuestion.toUpperCase(),
        baseQuestion.toLowerCase(),
        `  ${baseQuestion}  `, // Leading/trailing whitespace
        `\t${baseQuestion}\n`, // Different whitespace chars
        ` ${baseQuestion.toUpperCase()} ` // Combined case and whitespace
      ];
      
      // All variations should produce the same hash
      const hashes = variations.map(v => cache.generateHash(v));
      const firstHash = hashes[0];
      
      hashes.forEach(hash => {
        expect(hash).toBe(firstHash);
      });
      
    }), { numRuns: 30 });
  });

  test('Property 4c: Cache expiration behavior', () => {
    const questionGen = fc.string({ minLength: 10, maxLength: 100 });
    const responseGen = fc.record({ test: fc.string() });
    const ttlGen = fc.integer({ min: 50, max: 200 }); // Short TTLs for testing

    fc.assert(fc.property(questionGen, responseGen, ttlGen, (question, response, ttl) => {
      const hash = cache.generateHash(question);
      
      // Set with custom TTL
      cache.set(hash, response, ttl);
      
      // Should be available immediately
      expect(cache.has(hash)).toBe(true);
      expect(cache.get(hash)).toEqual(response);
      
      // Wait for expiration (using setTimeout would make test async and complex)
      // Instead, we'll test the expiration logic by manipulating the cache entry
      const entry = cache.cache.get(hash);
      if (entry) {
        // Simulate expiration by setting expiresAt to past
        entry.expiresAt = Date.now() - 1;
        
        // Should now be expired
        expect(cache.has(hash)).toBe(false);
        expect(cache.get(hash)).toBeNull();
      }
      
    }), { numRuns: 20 });
  });

  test('Property 4d: Cache statistics consistency', () => {
    const operationsGen = fc.array(
      fc.record({
        type: fc.constantFrom('get', 'set', 'delete'),
        question: fc.string({ minLength: 10, maxLength: 100 }),
        response: fc.record({ data: fc.string() })
      }),
      { minLength: 1, maxLength: 20 }
    );

    fc.assert(fc.property(operationsGen, (operations) => {
      // Create a fresh cache instance for clean statistics
      const freshCache = new CacheManager(`./cache/stats-test-${Date.now()}-${Math.random()}.json`);
      
      let expectedHits = 0;
      let expectedMisses = 0;
      let expectedSets = 0;
      let expectedDeletes = 0;
      const seenHashes = new Set();
      
      operations.forEach(op => {
        const hash = freshCache.generateHash(op.question);
        
        switch (op.type) {
          case 'get':
            const result = freshCache.get(hash);
            if (result) {
              expectedHits++;
            } else {
              expectedMisses++;
            }
            break;
            
          case 'set':
            freshCache.set(hash, op.response);
            expectedSets++;
            seenHashes.add(hash);
            break;
            
          case 'delete':
            if (freshCache.delete(hash)) {
              expectedDeletes++;
              seenHashes.delete(hash);
            }
            break;
        }
      });
      
      const stats = freshCache.getStats();
      expect(stats.hits).toBe(expectedHits);
      expect(stats.misses).toBe(expectedMisses);
      expect(stats.sets).toBe(expectedSets);
      expect(stats.deletes).toBe(expectedDeletes);
      
      // Hit rate should be calculated correctly
      const totalRequests = expectedHits + expectedMisses;
      const expectedHitRate = totalRequests > 0 ? (expectedHits / totalRequests) * 100 : 0;
      expect(stats.hitRate).toBeCloseTo(expectedHitRate, 2);
      
      // Cleanup fresh cache
      freshCache.destroy();
      
    }), { numRuns: 20 });
  });

  test('Property 4e: Cache persistence across instances', () => {
    const questionGen = fc.string({ minLength: 10, maxLength: 100 });
    const responseGen = fc.record({ 
      test: fc.string(),
      number: fc.integer()
    });

    fc.assert(fc.property(questionGen, responseGen, (question, response) => {
      const hash = cache.generateHash(question);
      
      // Store in first cache instance
      cache.set(hash, response);
      
      // Force save to file
      cache.saveCache();
      
      // Create new cache instance with same file
      const cache2 = new CacheManager(testCacheFile);
      
      // Should be able to retrieve from new instance
      const retrieved = cache2.get(hash);
      expect(retrieved).toEqual(response);
      
      // Cleanup second instance
      cache2.destroy();
      
    }), { numRuns: 10 }); // Fewer runs due to file I/O
  });

  test('Property 4f: Error handling for invalid inputs', () => {
    const invalidInputGen = fc.oneof(
      fc.constant(null),
      fc.constant(undefined),
      fc.integer(),
      fc.boolean(),
      fc.array(fc.string())
    );

    fc.assert(fc.property(invalidInputGen, (invalidInput) => {
      // generateHash should throw for non-string inputs
      expect(() => cache.generateHash(invalidInput)).toThrow();
      
      // get should throw for non-string hash
      expect(() => cache.get(invalidInput)).toThrow();
      
      // set should throw for non-string hash
      expect(() => cache.set(invalidInput, { test: 'data' })).toThrow();
      
      // delete should throw for non-string hash
      expect(() => cache.delete(invalidInput)).toThrow();
      
    }), { numRuns: 20 });
  });

  test('Property 4g: Cleanup removes expired entries', () => {
    const entriesGen = fc.array(
      fc.record({
        question: fc.string({ minLength: 10, maxLength: 50 }),
        response: fc.record({ data: fc.string() }),
        expired: fc.boolean()
      }),
      { minLength: 1, maxLength: 10 }
    );

    fc.assert(fc.property(entriesGen, (entries) => {
      cache.clear();
      
      let expiredCount = 0;
      
      entries.forEach(entry => {
        const hash = cache.generateHash(entry.question);
        const ttl = entry.expired ? 1 : 60000; // 1ms or 1 minute
        
        cache.set(hash, entry.response, ttl);
        
        if (entry.expired) {
          expiredCount++;
          // Force expiration by manipulating the entry
          const cacheEntry = cache.cache.get(hash);
          if (cacheEntry) {
            cacheEntry.expiresAt = Date.now() - 1;
          }
        }
      });
      
      const sizeBefore = cache.cache.size;
      const removed = cache.cleanup();
      const sizeAfter = cache.cache.size;
      
      // Should have removed expired entries
      expect(removed).toBeLessThanOrEqual(expiredCount);
      expect(sizeAfter).toBe(sizeBefore - removed);
      
    }), { numRuns: 15 });
  });
});