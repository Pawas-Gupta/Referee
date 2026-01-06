/**
 * Prompt Builder for Trade-Off Referee
 * Builds structured prompts using Core Prompt Template
 * Based on requirements 2.1, 2.4
 */

const fs = require('fs');
const path = require('path');

class PromptBuilder {
  constructor(templatePath = null) {
    this.templatePath = templatePath || path.join(process.cwd(), 'Core Prompt Template');
    this.template = null;
    this.loadTemplate();
  }

  /**
   * Loads the core prompt template from file
   * @private
   */
  loadTemplate() {
    try {
      this.template = fs.readFileSync(this.templatePath, 'utf8');
    } catch (error) {
      // Fallback to embedded template if file not found
      this.template = this.getDefaultTemplate();
    }
  }

  /**
   * Builds a structured prompt for the given user question
   * @param {string} userQuestion - The user's decision-oriented question
   * @returns {string} - Complete prompt with user question substituted
   */
  buildPrompt(userQuestion) {
    if (!userQuestion || typeof userQuestion !== 'string') {
      throw new Error('User question must be a non-empty string');
    }

    const trimmedQuestion = userQuestion.trim();
    if (trimmedQuestion.length === 0) {
      throw new Error('User question cannot be empty');
    }

    // Substitute the user question placeholder
    // Escape special characters in the replacement string to avoid issues with $ characters
    const escapedQuestion = trimmedQuestion.replace(/\$/g, '$$$$');
    const prompt = this.template.replace('{{user_question}}', escapedQuestion);
    
    return prompt;
  }

  /**
   * Validates that a question appears to be decision-oriented
   * @param {string} userQuestion - The user's question
   * @returns {boolean} - True if question appears decision-oriented
   */
  isDecisionOriented(userQuestion) {
    if (!userQuestion || typeof userQuestion !== 'string') {
      return false;
    }

    const decisionKeywords = [
      'should i', 'which', 'better', 'best', 'approach', 'way to',
      'how to', 'what to', 'choose', 'decide', 'option', 'alternative',
      'vs', 'versus', 'compare', 'or', 'either', 'build', 'implement',
      'use', 'pick', 'select', 'recommend'
    ];

    const lowerQuestion = userQuestion.toLowerCase();
    return decisionKeywords.some(keyword => lowerQuestion.includes(keyword));
  }

  /**
   * Estimates token count for the prompt (rough approximation)
   * @param {string} userQuestion - The user's question
   * @returns {number} - Estimated token count
   */
  estimateTokenCount(userQuestion) {
    const prompt = this.buildPrompt(userQuestion);
    // Rough approximation: 1 token ≈ 4 characters for English text
    return Math.ceil(prompt.length / 4);
  }

  /**
   * Gets the current template content
   * @returns {string} - Current template
   */
  getTemplate() {
    return this.template;
  }

  /**
   * Sets a custom template (useful for testing)
   * @param {string} template - Custom template string
   */
  setTemplate(template) {
    if (typeof template !== 'string') {
      throw new Error('Template must be a string');
    }
    this.template = template;
  }

  /**
   * Reloads template from file
   */
  reloadTemplate() {
    this.loadTemplate();
  }

  /**
   * Default embedded template as fallback
   * @private
   * @returns {string} - Default template
   */
  getDefaultTemplate() {
    return `You are a Trade-Off Decision Assistant.

A user has asked a question about building a project, choosing an approach,
or deciding between multiple ways of doing something.

Your job is NOT to give a single final answer.

You must generate:
- a primary approach
- an alternative approach
- pros and cons for each
- trade-offs
- when each option is better
- an optional hybrid strategy
- a conditional recommendation

Rules:
- Keep responses compact and structured
- Prefer bullet points instead of long paragraphs
- Stay token-efficient
- Respond ONLY in valid JSON using the project schema
- Do not add extra text outside the JSON

User Question:
{{user_question}}

`;
  }

  /**
   * Validates template has required placeholder
   * @returns {boolean} - True if template is valid
   */
  validateTemplate() {
    return this.template && this.template.includes('{{user_question}}');
  }

  /**
   * Gets template statistics
   * @returns {Object} - Template statistics
   */
  getTemplateStats() {
    return {
      hasTemplate: !!this.template,
      templateLength: this.template ? this.template.length : 0,
      hasPlaceholder: this.validateTemplate(),
      estimatedBaseTokens: this.template ? Math.ceil(this.template.replace('{{user_question}}', '').length / 4) : 0
    };
  }
}

module.exports = PromptBuilder;