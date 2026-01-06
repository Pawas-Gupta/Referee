import React, { useState } from 'react';

const QuestionInput = ({ onSubmit, loading, error, backendConnected }) => {
  const [question, setQuestion] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (question.trim() && !loading && backendConnected) {
      onSubmit(question.trim());
    }
  };

  return (
    <div>
      <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-2">
        Ask a question
      </label>
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          id="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="I want to build an AI chatbot. What's the best approach?"
          className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          rows={4}
          maxLength={500}
          disabled={loading || !backendConnected}
          aria-describedby="question-help question-count"
          aria-invalid={error ? 'true' : 'false'}
        />
        
        <button
          type="submit"
          disabled={!question.trim() || loading || !backendConnected}
          className="w-full bg-primary-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-describedby={loading ? "loading-status" : undefined}
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
              <span id="loading-status">Analyzing...</span>
            </div>
          ) : (
            'Compare Approaches'
          )}
        </button>
      </form>

      {error && (
        <div className="mt-3 p-3 bg-danger-50 border border-danger-200 rounded-lg" role="alert" aria-live="polite">
          <p className="text-sm text-danger-600">
            <span className="font-medium">Error:</span> {error}
          </p>
        </div>
      )}

      <div id="question-count" className="mt-2 text-xs text-gray-500" aria-live="polite">
        {question.length}/500 characters
      </div>
      
      <div id="question-help" className="sr-only">
        Enter your project or decision question to get a detailed comparison of approaches.
      </div>
    </div>
  );
};

export default QuestionInput;