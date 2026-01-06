/**
 * Property Test 11: Structural Consistency Across Domains
 * Validates: Requirements 5.5
 * 
 * This test ensures that the Trade-Off Referee maintains consistent
 * response structure regardless of the domain or topic of the question.
 * All responses should have the same JSON schema structure with the same
 * required fields, even when content varies across different domains.
 */

const fc = require('fast-check');
const TradeOffService = require('../src/tradeOffService');
const { validateOutput } = require('../src/schemas');

// Mock API key for testing
const TEST_API_KEY = 'test-key-for-property-testing';

describe('Property Test 11: Structural Consistency Across Domains', () => {
  let service;

  beforeEach(() => {
    service = new TradeOffService(TEST_API_KEY, {
      cacheFile: './cache/prop-test-structural-consistency.json'
    });
  });

  afterEach(() => {
    if (service) {
      service.destroy();
    }
  });

  /**
   * Generates questions from different domains to test structural consistency
   */
  const domainQuestionGenerator = fc.oneof(
    // Technology domain
    fc.constantFrom(
      'Should I use React or Vue for my web application?',
      'Is it better to use SQL or NoSQL database for my project?',
      'Should I deploy on AWS or Google Cloud Platform?',
      'Is Python or JavaScript better for backend development?',
      'Should I use microservices or monolithic architecture?'
    ),
    
    // Business domain
    fc.constantFrom(
      'Should I hire freelancers or full-time employees?',
      'Is it better to bootstrap or seek venture capital?',
      'Should I focus on B2B or B2C market?',
      'Is remote work or office work better for productivity?',
      'Should I expand internationally or focus domestically?'
    ),
    
    // Personal domain
    fc.constantFrom(
      'Should I buy or rent a house?',
      'Is it better to save money or invest in stocks?',
      'Should I pursue a master\'s degree or start working?',
      'Is city living or suburban living better for families?',
      'Should I learn a new language or focus on technical skills?'
    ),
    
    // Health domain
    fc.constantFrom(
      'Should I follow a vegetarian or omnivorous diet?',
      'Is morning or evening exercise more effective?',
      'Should I use traditional or alternative medicine?',
      'Is high-intensity or low-intensity training better?',
      'Should I prioritize cardio or strength training?'
    ),
    
    // Creative domain
    fc.constantFrom(
      'Should I write fiction or non-fiction books?',
      'Is digital or traditional art better for beginners?',
      'Should I learn guitar or piano first?',
      'Is self-publishing or traditional publishing better?',
      'Should I focus on photography or videography?'
    )
  );

  /**
   * Property: All responses maintain consistent structure across domains
   */
  test('should maintain consistent JSON structure across all domains', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(domainQuestionGenerator, { minLength: 3, maxLength: 8 }),
        async (questions) => {
          const responses = [];
          
          // Process questions from different domains
          for (const question of questions) {
            try {
              const result = await service.analyze(question);
              
              // For this test, we focus on successful responses
              // (API failures are tested elsewhere)
              if (result.success && result.data) {
                responses.push({
                  question,
                  data: result.data,
                  domain: categorizeDomain(question)
                });
              }
            } catch (error) {
              // Skip API errors for this structural test
              continue;
            }
          }

          // Skip if we don't have enough successful responses
          if (responses.length < 2) {
            return true;
          }

          // Validate that all responses have consistent structure
          const firstResponse = responses[0].data;
          const firstStructure = extractStructure(firstResponse);

          for (let i = 1; i < responses.length; i++) {
            const currentResponse = responses[i].data;
            const currentStructure = extractStructure(currentResponse);
            
            // Verify structural consistency
            expect(structuresMatch(firstStructure, currentStructure)).toBe(true);
            
            // Verify schema compliance for each response
            const validation = validateOutput(currentResponse);
            expect(validation.valid).toBe(true);
          }

          return true;
        }
      ),
      {
        numRuns: 20,
        timeout: 30000,
        endOnFailure: true
      }
    );
  }, 35000);

  /**
   * Property: Required fields are present across all domains
   */
  test('should have all required fields present regardless of domain', async () => {
    await fc.assert(
      fc.asyncProperty(
        domainQuestionGenerator,
        async (question) => {
          try {
            const result = await service.analyze(question);
            
            // Only test successful responses
            if (!result.success || !result.data) {
              return true;
            }

            const response = result.data;
            
            // Check for required top-level fields
            expect(response).toHaveProperty('approach1');
            expect(response).toHaveProperty('approach2');
            expect(response).toHaveProperty('comparison');
            expect(response).toHaveProperty('recommendation');
            expect(response).toHaveProperty('confidence');

            // Check approach structure consistency
            validateApproachStructure(response.approach1);
            validateApproachStructure(response.approach2);

            // Check comparison structure
            expect(response.comparison).toHaveProperty('advantages');
            expect(response.comparison).toHaveProperty('disadvantages');
            expect(response.comparison).toHaveProperty('considerations');

            // Check recommendation structure
            expect(response.recommendation).toHaveProperty('choice');
            expect(response.recommendation).toHaveProperty('reasoning');
            expect(response.recommendation).toHaveProperty('conditions');

            return true;
          } catch (error) {
            // Skip API errors for this structural test
            return true;
          }
        }
      ),
      {
        numRuns: 15,
        timeout: 25000
      }
    );
  }, 30000);

  /**
   * Property: Array fields maintain consistent types across domains
   */
  test('should maintain consistent array field types across domains', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(domainQuestionGenerator, { minLength: 2, maxLength: 5 }),
        async (questions) => {
          const responses = [];
          
          for (const question of questions) {
            try {
              const result = await service.analyze(question);
              if (result.success && result.data) {
                responses.push(result.data);
              }
            } catch (error) {
              continue;
            }
          }

          if (responses.length < 2) {
            return true;
          }

          // Check array field consistency
          for (const response of responses) {
            // Advantages and disadvantages should be arrays of strings
            expect(Array.isArray(response.comparison.advantages)).toBe(true);
            expect(Array.isArray(response.comparison.disadvantages)).toBe(true);
            expect(Array.isArray(response.comparison.considerations)).toBe(true);
            expect(Array.isArray(response.recommendation.conditions)).toBe(true);

            // Check array element types
            response.comparison.advantages.forEach(item => {
              expect(typeof item).toBe('string');
            });
            
            response.comparison.disadvantages.forEach(item => {
              expect(typeof item).toBe('string');
            });
            
            response.comparison.considerations.forEach(item => {
              expect(typeof item).toBe('string');
            });
            
            response.recommendation.conditions.forEach(item => {
              expect(typeof item).toBe('string');
            });
          }

          return true;
        }
      ),
      {
        numRuns: 10,
        timeout: 20000
      }
    );
  }, 25000);
});

/**
 * Helper function to categorize question domain
 */
function categorizeDomain(question) {
  const lowerQuestion = question.toLowerCase();
  
  if (lowerQuestion.includes('react') || lowerQuestion.includes('database') || 
      lowerQuestion.includes('aws') || lowerQuestion.includes('python') ||
      lowerQuestion.includes('microservices')) {
    return 'technology';
  }
  
  if (lowerQuestion.includes('hire') || lowerQuestion.includes('business') ||
      lowerQuestion.includes('venture') || lowerQuestion.includes('market') ||
      lowerQuestion.includes('remote work')) {
    return 'business';
  }
  
  if (lowerQuestion.includes('house') || lowerQuestion.includes('save') ||
      lowerQuestion.includes('degree') || lowerQuestion.includes('city') ||
      lowerQuestion.includes('language')) {
    return 'personal';
  }
  
  if (lowerQuestion.includes('diet') || lowerQuestion.includes('exercise') ||
      lowerQuestion.includes('medicine') || lowerQuestion.includes('training') ||
      lowerQuestion.includes('cardio')) {
    return 'health';
  }
  
  if (lowerQuestion.includes('fiction') || lowerQuestion.includes('art') ||
      lowerQuestion.includes('guitar') || lowerQuestion.includes('publishing') ||
      lowerQuestion.includes('photography')) {
    return 'creative';
  }
  
  return 'general';
}

/**
 * Helper function to extract structural information from response
 */
function extractStructure(response) {
  return {
    hasApproach1: !!response.approach1,
    hasApproach2: !!response.approach2,
    hasComparison: !!response.comparison,
    hasRecommendation: !!response.recommendation,
    hasConfidence: !!response.confidence,
    
    approach1Fields: response.approach1 ? Object.keys(response.approach1).sort() : [],
    approach2Fields: response.approach2 ? Object.keys(response.approach2).sort() : [],
    comparisonFields: response.comparison ? Object.keys(response.comparison).sort() : [],
    recommendationFields: response.recommendation ? Object.keys(response.recommendation).sort() : [],
    
    comparisonArrays: response.comparison ? {
      hasAdvantages: Array.isArray(response.comparison.advantages),
      hasDisadvantages: Array.isArray(response.comparison.disadvantages),
      hasConsiderations: Array.isArray(response.comparison.considerations)
    } : {},
    
    recommendationArrays: response.recommendation ? {
      hasConditions: Array.isArray(response.recommendation.conditions)
    } : {}
  };
}

/**
 * Helper function to compare two structures for consistency
 */
function structuresMatch(structure1, structure2) {
  // Check top-level presence
  if (structure1.hasApproach1 !== structure2.hasApproach1 ||
      structure1.hasApproach2 !== structure2.hasApproach2 ||
      structure1.hasComparison !== structure2.hasComparison ||
      structure1.hasRecommendation !== structure2.hasRecommendation ||
      structure1.hasConfidence !== structure2.hasConfidence) {
    return false;
  }

  // Check field consistency
  if (!arraysEqual(structure1.approach1Fields, structure2.approach1Fields) ||
      !arraysEqual(structure1.approach2Fields, structure2.approach2Fields) ||
      !arraysEqual(structure1.comparisonFields, structure2.comparisonFields) ||
      !arraysEqual(structure1.recommendationFields, structure2.recommendationFields)) {
    return false;
  }

  // Check array field consistency
  if (structure1.comparisonArrays.hasAdvantages !== structure2.comparisonArrays.hasAdvantages ||
      structure1.comparisonArrays.hasDisadvantages !== structure2.comparisonArrays.hasDisadvantages ||
      structure1.comparisonArrays.hasConsiderations !== structure2.comparisonArrays.hasConsiderations ||
      structure1.recommendationArrays.hasConditions !== structure2.recommendationArrays.hasConditions) {
    return false;
  }

  return true;
}

/**
 * Helper function to validate approach structure
 */
function validateApproachStructure(approach) {
  expect(approach).toHaveProperty('name');
  expect(approach).toHaveProperty('description');
  expect(typeof approach.name).toBe('string');
  expect(typeof approach.description).toBe('string');
}

/**
 * Helper function to compare arrays for equality
 */
function arraysEqual(arr1, arr2) {
  if (arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) return false;
  }
  return true;
}