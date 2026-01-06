/**
 * Schema validation utilities for Trade-Off Referee
 * Combines input and output schema validation
 */

const { inputSchema, validateInput } = require('./inputSchema');
const { outputSchema, createDefaultResponse, validateOutput } = require('./outputSchema');

/**
 * Validates a complete request-response cycle
 * @param {Object} input - The input to validate
 * @param {Object} output - The output to validate (optional)
 * @returns {Object} - Validation results for both input and output
 */
function validateRequestResponse(input, output = null) {
  const inputValidation = validateInput(input);
  let outputValidation = null;
  
  if (output !== null) {
    outputValidation = validateOutput(output);
  }
  
  return {
    input: inputValidation,
    output: outputValidation,
    valid: inputValidation.valid && (output === null || outputValidation.valid)
  };
}

/**
 * Creates error response for invalid input
 * @param {Array} errors - Array of error messages
 * @returns {Object} - Standardized error response
 */
function createErrorResponse(errors) {
  return {
    error: true,
    message: 'Validation failed',
    details: errors,
    timestamp: new Date().toISOString()
  };
}

/**
 * Checks if a question is decision-oriented
 * @param {string} question - The user's question
 * @returns {boolean} - True if question appears to be decision-oriented
 */
function isDecisionOriented(question) {
  const decisionKeywords = [
    'should i', 'which', 'better', 'best', 'approach', 'way to',
    'how to', 'what to', 'choose', 'decide', 'option', 'alternative',
    'vs', 'versus', 'compare', 'or', 'either'
  ];
  
  const lowerQuestion = question.toLowerCase();
  return decisionKeywords.some(keyword => lowerQuestion.includes(keyword));
}

module.exports = {
  // Schemas
  inputSchema,
  outputSchema,
  
  // Validation functions
  validateInput,
  validateOutput,
  validateRequestResponse,
  
  // Utility functions
  createDefaultResponse,
  createErrorResponse,
  isDecisionOriented
};