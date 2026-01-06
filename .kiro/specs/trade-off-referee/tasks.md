# Implementation Plan: Trade-Off Referee

## Overview

This implementation plan converts the Trade-Off Referee design into discrete coding tasks for building a Node.js/Express backend with Groq API integration. The tasks focus on core functionality first, with optional testing tasks that can be skipped for faster MVP development. Each task builds incrementally toward a complete decision-support system.

## Tasks

- [x] 1. Set up project structure and dependencies
  - Initialize Node.js project with package.json
  - Install Express, cors, dotenv, crypto, and fs dependencies
  - Create directory structure (src/, cache/, tests/)
  - Set up environment configuration for Groq API key
  - _Requirements: 2.1, 4.1_

- [x] 2. Implement core data models and validation
  - [x] 2.1 Create JSON schema definitions for input and output
    - Define input validation schema for user questions
    - Define output schema matching PROJECT_REFERENCE.md specification
    - Create schema validation utilities
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 2.2 Write property test for JSON schema compliance
    - **Property 2: JSON Schema Compliance**
    - **Validates: Requirements 1.4, 4.3, 6.1, 6.2, 6.3, 6.4, 6.5**

  - [x] 2.3 Implement response validator class
    - Create ResponseValidator with validateAndNormalize method
    - Handle missing fields by adding defaults (empty arrays, empty strings)
    - Normalize string fields and whitespace
    - _Requirements: 3.1, 3.2, 6.4, 6.5_

  - [x] 2.4 Write property test for response normalization
    - **Property 9: Response Normalization**
    - **Validates: Requirements 3.1, 3.2**

- [x] 3. Implement prompt building and API integration
  - [x] 3.1 Create PromptBuilder class
    - Implement buildPrompt method using Core Prompt Template
    - Handle user question substitution with {{user_question}} placeholder
    - Ensure token-efficient prompt structure
    - _Requirements: 2.1, 2.4_

  - [x] 3.2 Write property test for prompt structure consistency
    - **Property 6: Prompt Structure Consistency**
    - **Validates: Requirements 2.1, 2.4**

  - [x] 3.3 Implement GroqClient class
    - Create API client with primary (llama-3.3-70b-versatile) and fallback (mixtral-8x7b-instruct) models
    - Implement callAPI method with error handling
    - Add rate limit detection and exponential backoff retry logic
    - _Requirements: 2.2, 2.3, 2.5_

  - [x] 3.4 Write property test for model configuration compliance
    - **Property 8: Model Configuration Compliance**
    - **Validates: Requirements 2.3**

  - [x] 3.5 Write property test for rate limit handling
    - **Property 7: Rate Limit Handling**
    - **Validates: Requirements 2.2**

- [x] 4. Implement caching system
  - [x] 4.1 Create CacheManager class
    - Implement local JSON file-based caching
    - Create get, set, and generateHash methods
    - Add cache expiration and cleanup logic
    - _Requirements: 3.3, 3.4, 4.5_

  - [x] 4.2 Write property test for cache-first behavior
    - **Property 4: Cache-First Behavior**
    - **Validates: Requirements 3.3, 3.4, 4.5**

  - [x] 4.3 Integrate cache with API workflow
    - Modify API calling logic to check cache first
    - Store validated responses in cache after API calls
    - _Requirements: 3.3, 3.4_

- [x] 5. Checkpoint - Core backend functionality complete
  - Ensure all core classes are implemented and integrated
  - Verify cache, validation, and API calling work together
  - Ask the user if questions arise

- [x] 6. Implement Express server and endpoints
  - [x] 6.1 Create Express server setup
    - Configure Express app with CORS and JSON middleware
    - Set up error handling middleware
    - Add request logging and basic security headers
    - _Requirements: 4.1, 4.4_

  - [x] 6.2 Implement /compare endpoint
    - Create POST endpoint that accepts user questions
    - Integrate complete analysis pipeline (cache → API → validation)
    - Return structured JSON responses matching schema
    - Handle errors with appropriate HTTP status codes
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 6.3 Write property test for dual approach generation
    - **Property 1: Dual Approach Generation**
    - **Validates: Requirements 1.1, 1.2**

  - [x] 6.4 Write property test for conditional guidance completeness
    - **Property 3: Conditional Guidance Completeness**
    - **Validates: Requirements 1.3**

  - [x] 6.5 Write property test for HTTP error handling
    - **Property 10: HTTP Error Handling**
    - **Validates: Requirements 4.4**

- [x] 7. Implement comprehensive error handling
  - [x] 7.1 Add rate limit handler class
    - Create RateLimitHandler for processing 429 responses
    - Extract retry-after headers and implement backoff logic
    - _Requirements: 2.2_

  - [x] 7.2 Add application-level error handling
    - Handle invalid user input with 400 responses
    - Handle API failures with appropriate fallbacks
    - Handle cache corruption and file system errors
    - _Requirements: 4.4_

  - [x] 7.3 Write property test for validation without additional API calls
    - **Property 5: Response Validation Without Additional API Calls**
    - **Validates: Requirements 2.5, 3.5**

- [x] 8. Integration and final wiring
  - [x] 8.1 Wire all components together in main server
    - Connect PromptBuilder, GroqClient, ResponseValidator, and CacheManager
    - Ensure proper dependency injection and error propagation
    - Add environment variable configuration
    - _Requirements: 4.2_

  - [x] 8.2 Add request/response logging and monitoring
    - Log API calls, cache hits/misses, and error conditions
    - Add basic metrics for debugging and optimization
    - _Requirements: 4.4_

  - [x] 8.3 Write property test for structural consistency across domains
    - **Property 11: Structural Consistency Across Domains**
    - **Validates: Requirements 5.5**

  - [x] 8.4 Write integration tests for complete pipeline
    - Test end-to-end request processing
    - Test error scenarios and recovery
    - _Requirements: 4.2, 4.3_

- [x] 9. Final checkpoint - Complete backend system
  - Ensure all tests pass and system handles various question types
  - Verify rate limiting, caching, and error handling work correctly
  - Test with actual Groq API calls (limited to avoid rate limits)
  - Ask the user if questions arise

- [ ] 10. Implement React frontend interface
  - [x] 10.1 Set up React project structure and dependencies
    - Initialize React project with Create React App or Vite
    - Install Tailwind CSS and required dependencies
    - Set up component directory structure
    - _Requirements: Frontend UI for decision analysis display_

  - [x] 10.2 Create core UI components
    - Implement Sidebar component with app title and question input
    - Create QuestionInput component with form handling
    - Build ComparisonPanel for displaying analysis results
    - Create ApproachCard component for approach display
    - _Requirements: Frontend UI components_

  - [x] 10.3 Implement approach comparison components
    - Create ProsConsList component with icons
    - Build TradeoffsBox component for trade-off display
    - Implement RecommendationFooter for final recommendations
    - Add responsive design with Tailwind CSS
    - _Requirements: Structured comparison display_

  - [x] 10.4 Wire frontend to backend API
    - Implement API client for /compare endpoint
    - Add loading states and error handling
    - Connect form submission to backend
    - Display structured JSON response in UI components
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 10.5 Add responsive design and accessibility
    - Implement mobile-responsive layout
    - Add proper ARIA labels and keyboard navigation
    - Test with screen readers and accessibility tools
    - _Requirements: Accessible, responsive layout_

- [ ] 11. Final integration and testing
  - [x] 11.1 Test complete frontend-backend integration
    - Test question submission and response display
    - Verify error handling and loading states
    - Test responsive design on different screen sizes
    - _Requirements: Complete system integration_

  - [x] 11.2 Final system checkpoint
    - Ensure complete system works end-to-end
    - Test with various question types and edge cases
    - Verify UI matches design mockup requirements
    - Ask the user if questions arise

## Notes

- Each task references specific requirements for traceability
- Property tests validate universal correctness properties using fast-check library
- Unit tests validate specific examples and edge cases
- Checkpoints ensure incremental validation and user feedback
- Focus on backend implementation first as specified in project requirements