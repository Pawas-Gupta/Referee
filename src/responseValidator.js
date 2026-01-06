/**
 * Response Validator for Trade-Off Referee
 * Validates and normalizes API responses without making additional LLM calls
 * Based on requirements 3.1, 3.2, 6.4, 6.5
 */

const { validateOutput, createDefaultResponse } = require('./schemas');

class ResponseValidator {
  constructor() {
    this.validationStats = {
      totalValidations: 0,
      successfulValidations: 0,
      normalizedResponses: 0,
      errors: []
    };
  }

  /**
   * Validates and normalizes an API response
   * Never calls the LLM again - only fixes formatting issues in code
   * @param {string|Object} apiResponse - Raw API response (JSON string or object)
   * @returns {Object} - { success: boolean, data: Object, errors: Array, normalized: boolean }
   */
  validateAndNormalize(apiResponse) {
    this.validationStats.totalValidations++;
    
    try {
      // Parse JSON if response is a string
      let parsedResponse;
      if (typeof apiResponse === 'string') {
        try {
          parsedResponse = JSON.parse(apiResponse);
        } catch (parseError) {
          return this._handleError('Invalid JSON format', parseError, apiResponse);
        }
      } else if (typeof apiResponse === 'object' && apiResponse !== null) {
        parsedResponse = apiResponse;
      } else {
        return this._handleError('Response must be a JSON string or object', null, apiResponse);
      }

      // Validate and normalize using schema validator
      const validationResult = validateOutput(parsedResponse);
      
      // Determine if normalization occurred
      const wasNormalized = !validationResult.valid || this._hasNormalizationChanges(parsedResponse, validationResult.data);
      
      if (wasNormalized) {
        this.validationStats.normalizedResponses++;
      }

      this.validationStats.successfulValidations++;

      return {
        success: true,
        data: validationResult.data,
        errors: validationResult.errors,
        normalized: wasNormalized,
        originalValid: validationResult.valid
      };

    } catch (error) {
      return this._handleError('Unexpected validation error', error, apiResponse);
    }
  }

  /**
   * Validates multiple responses in batch
   * @param {Array} responses - Array of API responses
   * @returns {Array} - Array of validation results
   */
  validateBatch(responses) {
    if (!Array.isArray(responses)) {
      throw new Error('Responses must be an array');
    }

    return responses.map((response, index) => {
      const result = this.validateAndNormalize(response);
      return {
        index,
        ...result
      };
    });
  }

  /**
   * Checks if the response is structurally complete
   * @param {Object} response - Validated response object
   * @returns {boolean} - True if response has all required content
   */
  isResponseComplete(response) {
    if (!response || typeof response !== 'object') {
      return false;
    }

    // Check for essential content (not just structure)
    const hasContent = Boolean(
      response.problem_summary && response.problem_summary.trim().length > 0 &&
      response.primary_approach && response.primary_approach.title && response.primary_approach.title.trim().length > 0 &&
      response.alternative_approach && response.alternative_approach.title && response.alternative_approach.title.trim().length > 0 &&
      response.when_to_choose && 
      Array.isArray(response.when_to_choose.choose_primary_if) && response.when_to_choose.choose_primary_if.length > 0 &&
      Array.isArray(response.when_to_choose.choose_alternative_if) && response.when_to_choose.choose_alternative_if.length > 0
    );

    return hasContent;
  }

  /**
   * Gets validation statistics
   * @returns {Object} - Validation statistics
   */
  getStats() {
    return {
      ...this.validationStats,
      successRate: this.validationStats.totalValidations > 0 
        ? (this.validationStats.successfulValidations / this.validationStats.totalValidations) * 100 
        : 0,
      normalizationRate: this.validationStats.totalValidations > 0
        ? (this.validationStats.normalizedResponses / this.validationStats.totalValidations) * 100
        : 0
    };
  }

  /**
   * Resets validation statistics
   */
  resetStats() {
    this.validationStats = {
      totalValidations: 0,
      successfulValidations: 0,
      normalizedResponses: 0,
      errors: []
    };
  }

  /**
   * Handles validation errors
   * @private
   */
  _handleError(message, error, originalResponse) {
    const errorInfo = {
      message,
      error: error ? error.message : null,
      timestamp: new Date().toISOString(),
      responseType: typeof originalResponse,
      responseLength: typeof originalResponse === 'string' ? originalResponse.length : null
    };

    this.validationStats.errors.push(errorInfo);

    return {
      success: false,
      data: createDefaultResponse(),
      errors: [message],
      normalized: true,
      originalValid: false,
      errorDetails: errorInfo
    };
  }

  /**
   * Checks if normalization changes occurred
   * @private
   */
  _hasNormalizationChanges(original, normalized) {
    try {
      // Simple deep comparison for key structural changes
      const originalStr = JSON.stringify(original);
      const normalizedStr = JSON.stringify(normalized);
      return originalStr !== normalizedStr;
    } catch {
      return true; // Assume normalization occurred if comparison fails
    }
  }
}

module.exports = ResponseValidator;