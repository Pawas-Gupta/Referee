/**
 * Property-based tests for Response Validator
 * Feature: trade-off-referee, Property 9: Response Normalization
 * Validates: Requirements 3.1, 3.2
 */

const fc = require('fast-check');
const ResponseValidator = require('../src/responseValidator');

describe('Response Validator Property Tests', () => {
  let validator;

  beforeEach(() => {
    validator = new ResponseValidator();
  });

  /**
   * Property 9: Response Normalization
   * For any malformed API response, the validation engine should normalize 
   * missing arrays to empty arrays and handle missing fields appropriately without failing
   */
  test('Property 9: Response Normalization - Malformed responses are normalized without failing', () => {
    // Generator for potentially malformed approach objects
    const malformedApproachGen = fc.record({
      title: fc.oneof(fc.string(), fc.constant(null), fc.constant(undefined)),
      description: fc.oneof(fc.string(), fc.constant(null), fc.constant(undefined)),
      pros: fc.oneof(
        fc.array(fc.string()),
        fc.constant(null),
        fc.constant(undefined),
        fc.string(), // Wrong type
        fc.integer() // Wrong type
      ),
      cons: fc.oneof(
        fc.array(fc.string()),
        fc.constant(null),
        fc.constant(undefined),
        fc.string(), // Wrong type
        fc.integer() // Wrong type
      ),
      tradeoffs: fc.oneof(fc.string(), fc.constant(null), fc.constant(undefined))
    }, { requiredKeys: [] }); // Allow missing keys

    // Generator for potentially malformed when_to_choose objects
    const malformedWhenToChooseGen = fc.record({
      choose_primary_if: fc.oneof(
        fc.array(fc.string()),
        fc.constant(null),
        fc.constant(undefined),
        fc.string() // Wrong type
      ),
      choose_alternative_if: fc.oneof(
        fc.array(fc.string()),
        fc.constant(null),
        fc.constant(undefined),
        fc.string() // Wrong type
      )
    }, { requiredKeys: [] }); // Allow missing keys

    // Generator for malformed complete responses
    const malformedResponseGen = fc.record({
      problem_summary: fc.oneof(fc.string(), fc.constant(null), fc.constant(undefined)),
      primary_approach: fc.oneof(malformedApproachGen, fc.constant(null), fc.constant(undefined)),
      alternative_approach: fc.oneof(malformedApproachGen, fc.constant(null), fc.constant(undefined)),
      when_to_choose: fc.oneof(malformedWhenToChooseGen, fc.constant(null), fc.constant(undefined)),
      optional_hybrid_strategy: fc.oneof(fc.string(), fc.constant(null), fc.constant(undefined)),
      final_recommendation: fc.oneof(fc.string(), fc.constant(null), fc.constant(undefined))
    }, { requiredKeys: [] }); // Allow completely missing keys

    fc.assert(fc.property(malformedResponseGen, (malformedResponse) => {
      const result = validator.validateAndNormalize(malformedResponse);
      
      // Validation should never fail completely - always return a result
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Normalized data should always have the correct structure
      const data = result.data;
      
      // All required fields should exist
      expect(data).toHaveProperty('problem_summary');
      expect(data).toHaveProperty('primary_approach');
      expect(data).toHaveProperty('alternative_approach');
      expect(data).toHaveProperty('when_to_choose');
      expect(data).toHaveProperty('optional_hybrid_strategy');
      expect(data).toHaveProperty('final_recommendation');
      
      // String fields should be strings (never null/undefined)
      expect(typeof data.problem_summary).toBe('string');
      expect(typeof data.optional_hybrid_strategy).toBe('string');
      expect(typeof data.final_recommendation).toBe('string');
      
      // Approach objects should have correct structure
      ['primary_approach', 'alternative_approach'].forEach(key => {
        const approach = data[key];
        expect(approach).toHaveProperty('title');
        expect(approach).toHaveProperty('description');
        expect(approach).toHaveProperty('pros');
        expect(approach).toHaveProperty('cons');
        expect(approach).toHaveProperty('tradeoffs');
        
        expect(typeof approach.title).toBe('string');
        expect(typeof approach.description).toBe('string');
        expect(typeof approach.tradeoffs).toBe('string');
        
        // Arrays should be arrays (never null/undefined)
        expect(Array.isArray(approach.pros)).toBe(true);
        expect(Array.isArray(approach.cons)).toBe(true);
        
        // Array contents should be strings
        approach.pros.forEach(pro => expect(typeof pro).toBe('string'));
        approach.cons.forEach(con => expect(typeof con).toBe('string'));
      });
      
      // when_to_choose should have correct structure
      const whenToChoose = data.when_to_choose;
      expect(whenToChoose).toHaveProperty('choose_primary_if');
      expect(whenToChoose).toHaveProperty('choose_alternative_if');
      expect(Array.isArray(whenToChoose.choose_primary_if)).toBe(true);
      expect(Array.isArray(whenToChoose.choose_alternative_if)).toBe(true);
      
      // Choice arrays should contain only strings
      whenToChoose.choose_primary_if.forEach(choice => expect(typeof choice).toBe('string'));
      whenToChoose.choose_alternative_if.forEach(choice => expect(typeof choice).toBe('string'));
      
    }), { numRuns: 100 });
  });

  test('Property 9a: JSON string parsing never fails validation', () => {
    // Generator for potentially invalid JSON strings
    const jsonStringGen = fc.oneof(
      // Valid JSON objects
      fc.object().map(obj => JSON.stringify(obj)),
      // Invalid JSON strings
      fc.string().filter(s => {
        try {
          JSON.parse(s);
          return false; // Skip valid JSON
        } catch {
          return true; // Keep invalid JSON
        }
      }),
      // Empty/null strings
      fc.constantFrom('', 'null', 'undefined', '{}', '[]')
    );

    fc.assert(fc.property(jsonStringGen, (jsonString) => {
      const result = validator.validateAndNormalize(jsonString);
      
      // Should always return a result, never throw
      expect(result).toBeDefined();
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      
      // If parsing fails, should still provide normalized default response
      if (!result.success) {
        expect(result.data).toBeDefined();
        expect(result.data).toHaveProperty('problem_summary');
        expect(result.data).toHaveProperty('primary_approach');
        expect(result.data).toHaveProperty('alternative_approach');
      }
    }), { numRuns: 50 });
  });

  test('Property 9b: Batch validation maintains individual normalization', () => {
    // Generator for arrays of mixed valid/invalid responses
    const mixedResponsesGen = fc.array(
      fc.oneof(
        // Valid responses
        fc.record({
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
        }),
        // Invalid responses
        fc.record({
          problem_summary: fc.constant(null),
          primary_approach: fc.constant(undefined)
        })
      ),
      { minLength: 1, maxLength: 5 }
    );

    fc.assert(fc.property(mixedResponsesGen, (responses) => {
      const results = validator.validateBatch(responses);
      
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(responses.length);
      
      results.forEach((result, index) => {
        expect(result).toHaveProperty('index', index);
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('data');
        expect(result.success).toBe(true); // All should succeed after normalization
        
        // Each result should have proper structure
        expect(result.data).toHaveProperty('problem_summary');
        expect(result.data).toHaveProperty('primary_approach');
        expect(result.data).toHaveProperty('alternative_approach');
      });
    }), { numRuns: 20 });
  });

  test('Property 9c: Validation statistics are consistent', () => {
    const responseGen = fc.oneof(
      fc.record({ problem_summary: fc.string() }), // Valid partial
      fc.record({ invalid_field: fc.string() }), // Invalid
      fc.string() // JSON string
    );

    fc.assert(fc.property(fc.array(responseGen, { minLength: 1, maxLength: 10 }), (responses) => {
      validator.resetStats();
      
      responses.forEach(response => {
        validator.validateAndNormalize(response);
      });
      
      const stats = validator.getStats();
      
      expect(stats.totalValidations).toBe(responses.length);
      expect(stats.successfulValidations).toBeLessThanOrEqual(stats.totalValidations);
      expect(stats.normalizedResponses).toBeLessThanOrEqual(stats.totalValidations);
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeLessThanOrEqual(100);
      expect(stats.normalizationRate).toBeGreaterThanOrEqual(0);
      expect(stats.normalizationRate).toBeLessThanOrEqual(100);
      expect(Array.isArray(stats.errors)).toBe(true);
    }), { numRuns: 20 });
  });

  test('Property 9d: Response completeness check is consistent', () => {
    // Generator for responses with varying levels of completeness
    const responseCompletenessGen = fc.record({
      problem_summary: fc.oneof(fc.string({ minLength: 1 }), fc.constant('')),
      primary_approach: fc.record({
        title: fc.oneof(fc.string({ minLength: 1 }), fc.constant('')),
        description: fc.string(),
        pros: fc.array(fc.string()),
        cons: fc.array(fc.string()),
        tradeoffs: fc.string()
      }),
      alternative_approach: fc.record({
        title: fc.oneof(fc.string({ minLength: 1 }), fc.constant('')),
        description: fc.string(),
        pros: fc.array(fc.string()),
        cons: fc.array(fc.string()),
        tradeoffs: fc.string()
      }),
      when_to_choose: fc.record({
        choose_primary_if: fc.oneof(fc.array(fc.string(), { minLength: 1 }), fc.constant([])),
        choose_alternative_if: fc.oneof(fc.array(fc.string(), { minLength: 1 }), fc.constant([]))
      }),
      optional_hybrid_strategy: fc.string(),
      final_recommendation: fc.string()
    });

    fc.assert(fc.property(responseCompletenessGen, (response) => {
      const isComplete = validator.isResponseComplete(response);
      expect(typeof isComplete).toBe('boolean');
      
      // If marked as complete, should have essential content
      if (isComplete) {
        expect(response.problem_summary.trim().length).toBeGreaterThan(0);
        expect(response.primary_approach.title.trim().length).toBeGreaterThan(0);
        expect(response.alternative_approach.title.trim().length).toBeGreaterThan(0);
        expect(response.when_to_choose.choose_primary_if.length).toBeGreaterThan(0);
        expect(response.when_to_choose.choose_alternative_if.length).toBeGreaterThan(0);
      }
    }), { numRuns: 50 });
  });
});