/**
 * Output validation schema for Trade-Off Referee responses
 * Based on PROJECT_REFERENCE.md standard output schema
 */

const outputSchema = {
  type: 'object',
  properties: {
    problem_summary: {
      type: 'string',
      description: 'Brief summary of the user\'s problem or decision'
    },
    primary_approach: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        pros: { 
          type: 'array',
          items: { type: 'string' }
        },
        cons: { 
          type: 'array',
          items: { type: 'string' }
        },
        tradeoffs: { type: 'string' }
      },
      required: ['title', 'description', 'pros', 'cons', 'tradeoffs'],
      additionalProperties: false
    },
    alternative_approach: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        pros: { 
          type: 'array',
          items: { type: 'string' }
        },
        cons: { 
          type: 'array',
          items: { type: 'string' }
        },
        tradeoffs: { type: 'string' }
      },
      required: ['title', 'description', 'pros', 'cons', 'tradeoffs'],
      additionalProperties: false
    },
    when_to_choose: {
      type: 'object',
      properties: {
        choose_primary_if: {
          type: 'array',
          items: { type: 'string' }
        },
        choose_alternative_if: {
          type: 'array',
          items: { type: 'string' }
        }
      },
      required: ['choose_primary_if', 'choose_alternative_if'],
      additionalProperties: false
    },
    optional_hybrid_strategy: {
      type: 'string',
      description: 'Optional hybrid approach combining both strategies'
    },
    final_recommendation: {
      type: 'string',
      description: 'Conditional recommendation based on context'
    }
  },
  required: [
    'problem_summary',
    'primary_approach', 
    'alternative_approach',
    'when_to_choose',
    'optional_hybrid_strategy',
    'final_recommendation'
  ],
  additionalProperties: false
};

/**
 * Creates a default/empty response structure
 * @returns {Object} - Empty response matching the schema
 */
function createDefaultResponse() {
  return {
    problem_summary: '',
    primary_approach: {
      title: '',
      description: '',
      pros: [],
      cons: [],
      tradeoffs: ''
    },
    alternative_approach: {
      title: '',
      description: '',
      pros: [],
      cons: [],
      tradeoffs: ''
    },
    when_to_choose: {
      choose_primary_if: [],
      choose_alternative_if: []
    },
    optional_hybrid_strategy: '',
    final_recommendation: ''
  };
}

/**
 * Validates output against the schema and normalizes missing fields
 * @param {Object} output - The output object to validate
 * @returns {Object} - { valid: boolean, errors: Array, data: Object }
 */
function validateOutput(output) {
  const errors = [];
  const normalized = createDefaultResponse();
  
  if (!output || typeof output !== 'object') {
    return { 
      valid: false, 
      errors: ['Output must be an object'], 
      data: normalized 
    };
  }
  
  // Normalize problem_summary
  if (typeof output.problem_summary === 'string') {
    normalized.problem_summary = output.problem_summary.trim();
  } else if (output.problem_summary !== undefined) {
    errors.push('problem_summary must be a string');
  }
  
  // Normalize approaches
  ['primary_approach', 'alternative_approach'].forEach(approachKey => {
    const approach = output[approachKey];
    if (approach && typeof approach === 'object') {
      // Normalize string fields
      ['title', 'description', 'tradeoffs'].forEach(field => {
        if (typeof approach[field] === 'string') {
          normalized[approachKey][field] = approach[field].trim();
        } else if (approach[field] !== undefined) {
          errors.push(`${approachKey}.${field} must be a string`);
        }
      });
      
      // Normalize array fields
      ['pros', 'cons'].forEach(field => {
        if (Array.isArray(approach[field])) {
          normalized[approachKey][field] = approach[field]
            .filter(item => typeof item === 'string')
            .map(item => item.trim())
            .filter(item => item.length > 0);
        } else if (approach[field] !== undefined) {
          errors.push(`${approachKey}.${field} must be an array`);
        }
      });
    } else if (approach !== undefined) {
      errors.push(`${approachKey} must be an object`);
    }
  });
  
  // Normalize when_to_choose
  const whenToChoose = output.when_to_choose;
  if (whenToChoose && typeof whenToChoose === 'object') {
    ['choose_primary_if', 'choose_alternative_if'].forEach(field => {
      if (Array.isArray(whenToChoose[field])) {
        normalized.when_to_choose[field] = whenToChoose[field]
          .filter(item => typeof item === 'string')
          .map(item => item.trim())
          .filter(item => item.length > 0);
      } else if (whenToChoose[field] !== undefined) {
        errors.push(`when_to_choose.${field} must be an array`);
      }
    });
  } else if (whenToChoose !== undefined) {
    errors.push('when_to_choose must be an object');
  }
  
  // Normalize optional fields
  ['optional_hybrid_strategy', 'final_recommendation'].forEach(field => {
    if (typeof output[field] === 'string') {
      normalized[field] = output[field].trim();
    } else if (output[field] !== undefined) {
      errors.push(`${field} must be a string`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
    data: normalized
  };
}

module.exports = {
  outputSchema,
  createDefaultResponse,
  validateOutput
};