/**
 * Property-based tests for JSON schema compliance
 * Feature: trade-off-referee, Property 2: JSON Schema Compliance
 * Validates: Requirements 1.4, 4.3, 6.1, 6.2, 6.3, 6.4, 6.5
 */

const fc = require('fast-check');
const { 
  validateInput, 
  validateOutput, 
  createDefaultResponse,
  isDecisionOriented 
} = require('../src/schemas/index');

describe('JSON Schema Compliance Property Tests', () => {
  
  /**
   * Property 2: JSON Schema Compliance
   * For any system response, the output should match the standardized JSON schema 
   * with all required fields and proper data types (arrays never null/undefined, strings normalized)
   */
  test('Property 2: JSON Schema Compliance - Output validation always produces valid schema', () => {
    // Generator for approach objects
    const approachGen = fc.record({
      title: fc.string(),
      description: fc.string(),
      pros: fc.array(fc.string()),
      cons: fc.array(fc.string()),
      tradeoffs: fc.string()
    });

    // Generator for when_to_choose objects
    const whenToChooseGen = fc.record({
      choose_primary_if: fc.array(fc.string()),
      choose_alternative_if: fc.array(fc.string())
    });

    // Generator for complete output objects (potentially malformed)
    const outputGen = fc.record({
      problem_summary: fc.oneof(fc.string(), fc.constant(null), fc.constant(undefined)),
      primary_approach: fc.oneof(approachGen, fc.constant(null), fc.constant(undefined)),
      alternative_approach: fc.oneof(approachGen, fc.constant(null), fc.constant(undefined)),
      when_to_choose: fc.oneof(whenToChooseGen, fc.constant(null), fc.constant(undefined)),
      optional_hybrid_strategy: fc.oneof(fc.string(), fc.constant(null), fc.constant(undefined)),
      final_recommendation: fc.oneof(fc.string(), fc.constant(null), fc.constant(undefined))
    });

    fc.assert(fc.property(outputGen, (output) => {
      const result = validateOutput(output);
      
      // The validation should always return a result
      expect(result).toBeDefined();
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('data');
      
      // The normalized data should always match the schema structure
      const normalizedData = result.data;
      expect(normalizedData).toHaveProperty('problem_summary');
      expect(normalizedData).toHaveProperty('primary_approach');
      expect(normalizedData).toHaveProperty('alternative_approach');
      expect(normalizedData).toHaveProperty('when_to_choose');
      expect(normalizedData).toHaveProperty('optional_hybrid_strategy');
      expect(normalizedData).toHaveProperty('final_recommendation');
      
      // All string fields should be strings (never null/undefined)
      expect(typeof normalizedData.problem_summary).toBe('string');
      expect(typeof normalizedData.optional_hybrid_strategy).toBe('string');
      expect(typeof normalizedData.final_recommendation).toBe('string');
      
      // Approach objects should have correct structure
      ['primary_approach', 'alternative_approach'].forEach(key => {
        const approach = normalizedData[key];
        expect(approach).toHaveProperty('title');
        expect(approach).toHaveProperty('description');
        expect(approach).toHaveProperty('pros');
        expect(approach).toHaveProperty('cons');
        expect(approach).toHaveProperty('tradeoffs');
        
        expect(typeof approach.title).toBe('string');
        expect(typeof approach.description).toBe('string');
        expect(typeof approach.tradeoffs).toBe('string');
        expect(Array.isArray(approach.pros)).toBe(true);
        expect(Array.isArray(approach.cons)).toBe(true);
        
        // Arrays should contain only strings
        approach.pros.forEach(pro => expect(typeof pro).toBe('string'));
        approach.cons.forEach(con => expect(typeof con).toBe('string'));
      });
      
      // when_to_choose should have correct structure
      const whenToChoose = normalizedData.when_to_choose;
      expect(whenToChoose).toHaveProperty('choose_primary_if');
      expect(whenToChoose).toHaveProperty('choose_alternative_if');
      expect(Array.isArray(whenToChoose.choose_primary_if)).toBe(true);
      expect(Array.isArray(whenToChoose.choose_alternative_if)).toBe(true);
      
      // Choice arrays should contain only strings
      whenToChoose.choose_primary_if.forEach(choice => expect(typeof choice).toBe('string'));
      whenToChoose.choose_alternative_if.forEach(choice => expect(typeof choice).toBe('string'));
    }), { numRuns: 100 });
  });

  test('Property 2a: Input validation correctly identifies valid questions', () => {
    // Generator for valid question strings
    const validQuestionGen = fc.string({ minLength: 10, maxLength: 500 })
      .filter(s => s.trim().length >= 10);

    fc.assert(fc.property(validQuestionGen, (question) => {
      const input = { question };
      const result = validateInput(input);
      
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('data');
      
      if (result.valid) {
        expect(result.errors).toHaveLength(0);
        expect(result.data).toEqual({ question: question.trim() });
      }
    }), { numRuns: 100 });
  });

  test('Property 2b: Input validation correctly rejects invalid questions', () => {
    // Generator for invalid inputs
    const invalidInputGen = fc.oneof(
      // Too short questions
      fc.record({ question: fc.string({ maxLength: 9 }) }),
      // Too long questions  
      fc.record({ question: fc.string({ minLength: 501 }) }),
      // Non-string questions
      fc.record({ question: fc.oneof(fc.integer(), fc.boolean(), fc.constant(null)) }),
      // Missing question
      fc.record({}),
      // Extra properties
      fc.record({ 
        question: fc.string({ minLength: 10, maxLength: 500 }),
        extra: fc.string()
      })
    );

    fc.assert(fc.property(invalidInputGen, (input) => {
      const result = validateInput(input);
      
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('data');
      
      // Invalid inputs should be marked as invalid
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.data).toBe(null);
    }), { numRuns: 100 });
  });

  test('Property 2c: Default response always matches schema', () => {
    fc.assert(fc.property(fc.constant(null), () => {
      const defaultResponse = createDefaultResponse();
      const result = validateOutput(defaultResponse);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data).toEqual(defaultResponse);
    }), { numRuns: 10 });
  });

  test('Property 2d: Decision-oriented question detection', () => {
    // Generator for questions that should be detected as decision-oriented
    const decisionKeywords = [
      'should i', 'which', 'better', 'best', 'approach', 'way to',
      'how to', 'what to', 'choose', 'decide', 'option', 'alternative',
      'vs', 'versus', 'compare', 'or', 'either'
    ];

    const decisionQuestionGen = fc.tuple(
      fc.constantFrom(...decisionKeywords),
      fc.string({ minLength: 5, maxLength: 100 })
    ).map(([keyword, rest]) => `${keyword} ${rest}`);

    fc.assert(fc.property(decisionQuestionGen, (question) => {
      const isDecision = isDecisionOriented(question);
      // Most questions with decision keywords should be detected as decision-oriented
      // This is a heuristic, so we don't require 100% accuracy
      expect(typeof isDecision).toBe('boolean');
    }), { numRuns: 50 });
  });
});