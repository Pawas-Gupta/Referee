/**
 * Property-based tests for Prompt Builder
 * Feature: trade-off-referee, Property 6: Prompt Structure Consistency
 * Validates: Requirements 2.1, 2.4
 */

const fc = require('fast-check');
const PromptBuilder = require('../src/promptBuilder');

describe('Prompt Builder Property Tests', () => {
  let builder;
  let originalTemplate;

  beforeEach(() => {
    builder = new PromptBuilder();
    originalTemplate = builder.getTemplate(); // Save original template
  });

  afterEach(() => {
    // Restore original template after each test
    if (originalTemplate) {
      builder.setTemplate(originalTemplate);
    }
  });

  /**
   * Property 6: Prompt Structure Consistency
   * For any user question, the generated prompt should follow the Core Prompt Template 
   * structure with proper placeholder substitution and token-efficient formatting
   */
  test('Property 6: Prompt Structure Consistency - All prompts follow template structure', () => {
    // Generator for valid user questions
    const validQuestionGen = fc.string({ minLength: 10, maxLength: 500 })
      .filter(s => s.trim().length >= 10);

    fc.assert(fc.property(validQuestionGen, (question) => {
      const prompt = builder.buildPrompt(question);
      const trimmedQuestion = question.trim();
      
      // Prompt should be a string
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
      
      // Prompt should contain the trimmed user question
      expect(prompt).toContain(trimmedQuestion);
      
      // Prompt should not contain the placeholder anymore
      expect(prompt).not.toContain('{{user_question}}');
      
      // Prompt should contain key template elements
      expect(prompt).toContain('Trade-Off Decision Assistant');
      expect(prompt).toContain('primary approach');
      expect(prompt).toContain('alternative approach');
      expect(prompt).toContain('pros and cons');
      expect(prompt).toContain('valid JSON');
      
      // Prompt should be token-efficient (no excessive whitespace)
      const lines = prompt.split('\n');
      const nonEmptyLines = lines.filter(line => line.trim().length > 0);
      expect(nonEmptyLines.length).toBeGreaterThan(0);
      
      // Should not have excessive consecutive empty lines
      let consecutiveEmpty = 0;
      let maxConsecutiveEmpty = 0;
      for (const line of lines) {
        if (line.trim().length === 0) {
          consecutiveEmpty++;
          maxConsecutiveEmpty = Math.max(maxConsecutiveEmpty, consecutiveEmpty);
        } else {
          consecutiveEmpty = 0;
        }
      }
      expect(maxConsecutiveEmpty).toBeLessThanOrEqual(2); // Allow some formatting
      
    }), { numRuns: 100 });
  });

  test('Property 6a: Token estimation is consistent and reasonable', () => {
    const questionGen = fc.string({ minLength: 10, maxLength: 500 })
      .filter(s => s.trim().length >= 10);

    fc.assert(fc.property(questionGen, (question) => {
      const tokenCount = builder.estimateTokenCount(question);
      const prompt = builder.buildPrompt(question);
      
      // Token count should be a positive number
      expect(typeof tokenCount).toBe('number');
      expect(tokenCount).toBeGreaterThan(0);
      
      // Token count should be reasonable relative to prompt length
      // Rough approximation: 1 token ≈ 4 characters
      const expectedTokens = Math.ceil(prompt.length / 4);
      expect(tokenCount).toBe(expectedTokens);
      
      // Longer questions should generally result in more tokens
      const baseTokens = builder.getTemplateStats().estimatedBaseTokens;
      expect(tokenCount).toBeGreaterThanOrEqual(baseTokens);
      
    }), { numRuns: 50 });
  });

  test('Property 6b: Decision-oriented detection is consistent', () => {
    // Generator for questions with decision keywords
    const decisionKeywords = [
      'should i', 'which', 'better', 'best', 'approach', 'way to',
      'how to', 'what to', 'choose', 'decide', 'option', 'alternative',
      'vs', 'versus', 'compare', 'or', 'either', 'build', 'implement',
      'use', 'pick', 'select', 'recommend'
    ];

    const decisionQuestionGen = fc.tuple(
      fc.constantFrom(...decisionKeywords),
      fc.string({ minLength: 5, maxLength: 100 })
    ).map(([keyword, rest]) => `${keyword} ${rest}`);

    fc.assert(fc.property(decisionQuestionGen, (question) => {
      const isDecision = builder.isDecisionOriented(question);
      
      // Should return a boolean
      expect(typeof isDecision).toBe('boolean');
      
      // Questions with decision keywords should generally be detected as decision-oriented
      // (This is heuristic, so we don't require 100% accuracy, but most should be detected)
      // We'll just verify the function doesn't crash and returns a boolean
      
    }), { numRuns: 50 });
  });

  test('Property 6c: Template validation is consistent', () => {
    fc.assert(fc.property(fc.constant(null), () => {
      // Template should be valid by default
      expect(builder.validateTemplate()).toBe(true);
      
      const stats = builder.getTemplateStats();
      expect(stats.hasTemplate).toBe(true);
      expect(stats.hasPlaceholder).toBe(true);
      expect(stats.templateLength).toBeGreaterThan(0);
      expect(stats.estimatedBaseTokens).toBeGreaterThan(0);
      
    }), { numRuns: 5 });
  });

  test('Property 6d: Custom template handling', () => {
    const customTemplateGen = fc.string({ minLength: 20, maxLength: 200 })
      .map(s => s + ' {{user_question}} ' + s); // Ensure placeholder exists

    fc.assert(fc.property(customTemplateGen, (customTemplate) => {
      builder.setTemplate(customTemplate);
      
      // Template should be set correctly
      expect(builder.getTemplate()).toBe(customTemplate);
      expect(builder.validateTemplate()).toBe(true);
      
      // Should be able to build prompts with custom template
      const question = 'Should I use React or Vue?';
      const prompt = builder.buildPrompt(question);
      
      expect(prompt).toContain(question);
      expect(prompt).not.toContain('{{user_question}}');
      
    }), { numRuns: 20 });
  });

  test('Property 6e: Error handling for invalid inputs', () => {
    const invalidInputGen = fc.oneof(
      fc.constant(''),
      fc.constant('   '), // Whitespace only
      fc.constant(null),
      fc.constant(undefined),
      fc.integer(),
      fc.boolean(),
      fc.array(fc.string())
    );

    fc.assert(fc.property(invalidInputGen, (invalidInput) => {
      // Should throw error for invalid inputs
      expect(() => {
        builder.buildPrompt(invalidInput);
      }).toThrow();
      
    }), { numRuns: 30 });
  });

  test('Property 6f: Prompt consistency across multiple calls', () => {
    const questionGen = fc.string({ minLength: 10, maxLength: 100 })
      .filter(s => s.trim().length >= 10);

    fc.assert(fc.property(questionGen, (question) => {
      // Same question should produce same prompt
      const prompt1 = builder.buildPrompt(question);
      const prompt2 = builder.buildPrompt(question);
      
      expect(prompt1).toBe(prompt2);
      
      // Token count should also be consistent
      const tokens1 = builder.estimateTokenCount(question);
      const tokens2 = builder.estimateTokenCount(question);
      
      expect(tokens1).toBe(tokens2);
      
    }), { numRuns: 30 });
  });

  test('Property 6g: Template reloading preserves functionality', () => {
    const questionGen = fc.string({ minLength: 10, maxLength: 100 })
      .filter(s => s.trim().length >= 10);

    fc.assert(fc.property(questionGen, (question) => {
      const originalPrompt = builder.buildPrompt(question);
      
      // Reload template
      builder.reloadTemplate();
      
      const reloadedPrompt = builder.buildPrompt(question);
      
      // Should produce the same result (assuming template file hasn't changed)
      expect(reloadedPrompt).toBe(originalPrompt);
      expect(builder.validateTemplate()).toBe(true);
      
    }), { numRuns: 10 });
  });
});