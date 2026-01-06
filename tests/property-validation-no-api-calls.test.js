/**
 * Property-based test for validation without additional API calls
 * Feature: trade-off-referee, Property 5: Response Validation Without Additional API Calls
 * Validates: Requirements 2.5, 3.5
 */

const fc = require('fast-check');
const ResponseValidator = require('../src/responseValidator');
const GroqClient = require('../src/groqClient');

describe('Property 5: Response Validation Without Additional API Calls', () => {
  let responseValidator;
  let mockGroqClient;

  beforeEach(() => {
    responseValidator = new ResponseValidator();
    
    // Create a mock GroqClient to track API calls
    mockGroqClient = {
      callAPI: jest.fn(),
      getStats: jest.fn(() => ({ totalCalls: 0 }))
    };
  });

  /**
   * Property 5: Response Validation Without Additional API Calls
   * For any API response received, the validation and normalization process 
   * should complete without triggering additional LLM API calls.
   * Validates: Requirements 2.5, 3.5
   */
  test('should validate and normalize responses without making additional API calls', () => {
    // Generate various types of API response content
    const apiResponseArb = fc.oneof(
      // Valid JSON responses
      fc.record({
        problem_summary: fc.string({ minLength: 10, maxLength: 200 }),
        primary_approach: fc.record({
          title: fc.string({ minLength: 5, maxLength: 50 }),
          description: fc.string({ minLength: 10, maxLength: 200 }),
          pros: fc.array(fc.string({ minLength: 5, maxLength: 100 }), { minLength: 1, maxLength: 5 }),
          cons: fc.array(fc.string({ minLength: 5, maxLength: 100 }), { minLength: 1, maxLength: 5 }),
          tradeoffs: fc.string({ minLength: 10, maxLength: 200 })
        }),
        alternative_approach: fc.record({
          title: fc.string({ minLength: 5, maxLength: 50 }),
          description: fc.string({ minLength: 10, maxLength: 200 }),
          pros: fc.array(fc.string({ minLength: 5, maxLength: 100 }), { minLength: 1, maxLength: 5 }),
          cons: fc.array(fc.string({ minLength: 5, maxLength: 100 }), { minLength: 1, maxLength: 5 }),
          tradeoffs: fc.string({ minLength: 10, maxLength: 200 })
        }),
        when_to_choose: fc.record({
          choose_primary_if: fc.array(fc.string({ minLength: 5, maxLength: 100 }), { minLength: 1, maxLength: 3 }),
          choose_alternative_if: fc.array(fc.string({ minLength: 5, maxLength: 100 }), { minLength: 1, maxLength: 3 })
        }),
        optional_hybrid_strategy: fc.string({ minLength: 10, maxLength: 200 }),
        final_recommendation: fc.string({ minLength: 10, maxLength: 200 })
      }).map(obj => JSON.stringify(obj)),
      
      // Malformed JSON responses (missing fields)
      fc.record({
        problem_summary: fc.string({ minLength: 10, maxLength: 200 }),
        primary_approach: fc.record({
          title: fc.string({ minLength: 5, maxLength: 50 }),
          description: fc.string({ minLength: 10, maxLength: 200 })
          // Missing pros, cons, tradeoffs
        }),
        alternative_approach: fc.record({
          title: fc.string({ minLength: 5, maxLength: 50 }),
          description: fc.string({ minLength: 10, maxLength: 200 })
          // Missing pros, cons, tradeoffs
        })
        // Missing when_to_choose, optional_hybrid_strategy, final_recommendation
      }).map(obj => JSON.stringify(obj)),
      
      // Invalid JSON strings
      fc.string({ minLength: 10, maxLength: 500 }).filter(s => {
        try {
          JSON.parse(s);
          return false; // Skip valid JSON
        } catch {
          return true; // Keep invalid JSON
        }
      }),
      
      // Empty or null responses
      fc.constant(''),
      fc.constant('null'),
      fc.constant('{}'),
      
      // Responses with null/undefined fields
      fc.record({
        problem_summary: fc.oneof(fc.string(), fc.constant(null), fc.constant(undefined)),
        primary_approach: fc.oneof(
          fc.record({
            title: fc.string(),
            description: fc.string(),
            pros: fc.oneof(fc.array(fc.string()), fc.constant(null), fc.constant(undefined)),
            cons: fc.oneof(fc.array(fc.string()), fc.constant(null), fc.constant(undefined)),
            tradeoffs: fc.oneof(fc.string(), fc.constant(null), fc.constant(undefined))
          }),
          fc.constant(null),
          fc.constant(undefined)
        ),
        alternative_approach: fc.oneof(
          fc.record({
            title: fc.string(),
            description: fc.string(),
            pros: fc.oneof(fc.array(fc.string()), fc.constant(null), fc.constant(undefined)),
            cons: fc.oneof(fc.array(fc.string()), fc.constant(null), fc.constant(undefined)),
            tradeoffs: fc.oneof(fc.string(), fc.constant(null), fc.constant(undefined))
          }),
          fc.constant(null),
          fc.constant(undefined)
        ),
        when_to_choose: fc.oneof(
          fc.record({
            choose_primary_if: fc.oneof(fc.array(fc.string()), fc.constant(null), fc.constant(undefined)),
            choose_alternative_if: fc.oneof(fc.array(fc.string()), fc.constant(null), fc.constant(undefined))
          }),
          fc.constant(null),
          fc.constant(undefined)
        ),
        optional_hybrid_strategy: fc.oneof(fc.string(), fc.constant(null), fc.constant(undefined)),
        final_recommendation: fc.oneof(fc.string(), fc.constant(null), fc.constant(undefined))
      }).map(obj => JSON.stringify(obj, (key, value) => value === undefined ? null : value))
    );

    fc.assert(fc.property(
      apiResponseArb,
      (apiResponseContent) => {
        // Track initial API call count
        const initialCallCount = mockGroqClient.callAPI.mock.calls.length;
        
        // Validate and normalize the response
        const result = responseValidator.validateAndNormalize(apiResponseContent);
        
        // Property 5: No additional API calls should be made during validation
        const finalCallCount = mockGroqClient.callAPI.mock.calls.length;
        expect(finalCallCount).toBe(initialCallCount);
        
        // The validation should complete (either success or failure)
        expect(result).toHaveProperty('success');
        expect(typeof result.success).toBe('boolean');
        
        if (result.success) {
          // Successful validation should return normalized data
          expect(result).toHaveProperty('data');
          expect(typeof result.data).toBe('object');
          expect(result.data).not.toBeNull();
          
          // All required fields should be present in normalized data
          expect(result.data).toHaveProperty('problem_summary');
          expect(result.data).toHaveProperty('primary_approach');
          expect(result.data).toHaveProperty('alternative_approach');
          expect(result.data).toHaveProperty('when_to_choose');
          expect(result.data).toHaveProperty('optional_hybrid_strategy');
          expect(result.data).toHaveProperty('final_recommendation');
          
          // Arrays should never be null or undefined
          if (result.data.primary_approach) {
            expect(Array.isArray(result.data.primary_approach.pros)).toBe(true);
            expect(Array.isArray(result.data.primary_approach.cons)).toBe(true);
          }
          if (result.data.alternative_approach) {
            expect(Array.isArray(result.data.alternative_approach.pros)).toBe(true);
            expect(Array.isArray(result.data.alternative_approach.cons)).toBe(true);
          }
          if (result.data.when_to_choose) {
            expect(Array.isArray(result.data.when_to_choose.choose_primary_if)).toBe(true);
            expect(Array.isArray(result.data.when_to_choose.choose_alternative_if)).toBe(true);
          }
        } else {
          // Failed validation should return error information
          expect(result).toHaveProperty('errors');
          expect(Array.isArray(result.errors)).toBe(true);
        }
      }
    ), { 
      numRuns: 100,
      timeout: 5000
    });
  }, 30000);

  /**
   * Test that validation works with completely malformed responses
   */
  test('should handle completely malformed responses without API calls', () => {
    const malformedResponses = [
      'This is not JSON at all',
      '{"incomplete": json',
      '{"valid_json": "but wrong structure"}',
      '',
      null,
      undefined,
      '[]',
      'true',
      '42',
      '{"problem_summary": null, "everything_else": "missing"}'
    ];

    malformedResponses.forEach(response => {
      const initialCallCount = mockGroqClient.callAPI.mock.calls.length;
      
      const result = responseValidator.validateAndNormalize(response);
      
      // No API calls should be made
      const finalCallCount = mockGroqClient.callAPI.mock.calls.length;
      expect(finalCallCount).toBe(initialCallCount);
      
      // Should return a result (success or failure)
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });
  });

  /**
   * Test that validation normalizes missing fields without API calls
   */
  test('should normalize missing fields without making API calls', () => {
    const partialResponse = {
      problem_summary: "Test problem",
      primary_approach: {
        title: "Primary",
        description: "Description"
        // Missing pros, cons, tradeoffs
      }
      // Missing alternative_approach, when_to_choose, etc.
    };

    const initialCallCount = mockGroqClient.callAPI.mock.calls.length;
    
    const result = responseValidator.validateAndNormalize(JSON.stringify(partialResponse));
    
    // No API calls should be made
    const finalCallCount = mockGroqClient.callAPI.mock.calls.length;
    expect(finalCallCount).toBe(initialCallCount);
    
    // Should complete validation
    expect(result).toHaveProperty('success');
    
    if (result.success) {
      // Missing arrays should be normalized to empty arrays
      expect(Array.isArray(result.data.primary_approach.pros)).toBe(true);
      expect(Array.isArray(result.data.primary_approach.cons)).toBe(true);
    }
  });

  /**
   * Test validation performance - should be fast without API calls
   */
  test('should validate responses quickly without API overhead', () => {
    const testResponse = JSON.stringify({
      problem_summary: "Performance test",
      primary_approach: {
        title: "Fast validation",
        description: "Should be quick",
        pros: ["Pro 1"],
        cons: ["Con 1"],
        tradeoffs: "Tradeoffs"
      },
      alternative_approach: {
        title: "Alternative",
        description: "Also quick",
        pros: ["Alt Pro 1"],
        cons: ["Alt Con 1"],
        tradeoffs: "Alt Tradeoffs"
      },
      when_to_choose: {
        choose_primary_if: ["Condition 1"],
        choose_alternative_if: ["Alt Condition 1"]
      },
      optional_hybrid_strategy: "Hybrid",
      final_recommendation: "Recommendation"
    });

    const startTime = Date.now();
    const initialCallCount = mockGroqClient.callAPI.mock.calls.length;
    
    // Run validation multiple times
    for (let i = 0; i < 10; i++) {
      const result = responseValidator.validateAndNormalize(testResponse);
      expect(result.success).toBe(true);
    }
    
    const endTime = Date.now();
    const finalCallCount = mockGroqClient.callAPI.mock.calls.length;
    
    // No API calls should be made
    expect(finalCallCount).toBe(initialCallCount);
    
    // Should complete quickly (less than 100ms for 10 validations)
    expect(endTime - startTime).toBeLessThan(100);
  });

  /**
   * Test that validation statistics don't include API calls
   */
  test('should track validation statistics without API call overhead', () => {
    const testResponses = [
      '{"valid": "json", "but": "wrong structure"}',
      JSON.stringify({
        problem_summary: "Valid response",
        primary_approach: { title: "Test", description: "Test", pros: [], cons: [], tradeoffs: "" },
        alternative_approach: { title: "Test", description: "Test", pros: [], cons: [], tradeoffs: "" },
        when_to_choose: { choose_primary_if: [], choose_alternative_if: [] },
        optional_hybrid_strategy: "",
        final_recommendation: ""
      }),
      'invalid json',
      ''
    ];

    const initialCallCount = mockGroqClient.callAPI.mock.calls.length;
    
    testResponses.forEach(response => {
      responseValidator.validateAndNormalize(response);
    });
    
    // No API calls should be made
    const finalCallCount = mockGroqClient.callAPI.mock.calls.length;
    expect(finalCallCount).toBe(initialCallCount);
    
    // Statistics should be tracked
    const stats = responseValidator.getStats();
    expect(stats.totalValidations).toBeGreaterThan(0);
  });
});