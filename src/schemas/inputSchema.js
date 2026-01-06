/**
 * Input validation schema for user questions
 * Based on PROJECT_REFERENCE.md requirements
 */

const inputSchema = {
  type: 'object',
  properties: {
    question: {
      type: 'string',
      minLength: 10,
      maxLength: 500,
      pattern: '^.+$', // Non-empty after trimming
      description: 'User\'s decision-oriented question'
    }
  },
  required: ['question'],
  additionalProperties: false
};

/**
 * Validates user input against the schema
 * @param {Object} input - The input object to validate
 * @returns {Object} - { valid: boolean, errors: Array, data: Object }
 */
function validateInput(input) {
  const errors = [];
  
  // Check if input is an object
  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Input must be an object'], data: null };
  }
  
  // Check required question field
  if (!input.question) {
    errors.push('Question is required');
  } else if (typeof input.question !== 'string') {
    errors.push('Question must be a string');
  } else {
    const trimmed = input.question.trim();
    if (trimmed.length < 10) {
      errors.push('Question must be at least 10 characters long');
    } else if (trimmed.length > 500) {
      errors.push('Question must be no more than 500 characters long');
    }
  }
  
  // Check for additional properties
  const allowedKeys = ['question'];
  const extraKeys = Object.keys(input).filter(key => !allowedKeys.includes(key));
  if (extraKeys.length > 0) {
    errors.push(`Unexpected properties: ${extraKeys.join(', ')}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    data: errors.length === 0 ? { question: input.question.trim() } : null
  };
}

module.exports = {
  inputSchema,
  validateInput
};