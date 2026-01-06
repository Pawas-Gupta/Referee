import React from 'react';
import QuestionInput from './QuestionInput';

const Sidebar = ({ onQuestionSubmit, loading, error, backendConnected }) => {
  const recentQuestions = [
    "I want to build an AI chatbot. What's the best approach?",
    "Should I use MySQL or MongoDB for my app?",
    "What framework is best for building a SaaS platform?",
    "What's the best way to start a blog?"
  ];

  return (
    <div className="w-full lg:w-80 bg-white shadow-lg border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 lg:p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Trade-Off Referee</h1>
        </div>
      </div>

      {/* Question Input */}
      <div className="p-4 lg:p-6 border-b border-gray-200">
        <QuestionInput 
          onSubmit={onQuestionSubmit}
          loading={loading}
          error={error}
          backendConnected={backendConnected}
        />
      </div>

      {/* Recent Questions */}
      <div className="flex-1 p-4 lg:p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Recent Questions</h3>
        <div className="space-y-3">
          {recentQuestions.map((question, index) => (
            <button
              key={index}
              onClick={() => onQuestionSubmit(question)}
              disabled={loading || !backendConnected}
              className="w-full text-left p-3 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              aria-label={`Ask question: ${question}`}
            >
              {question}
            </button>
          ))}
        </div>
      </div>

      {/* Hybrid Strategy Info Card */}
      <div className="p-4 lg:p-6 border-t border-gray-200">
        <div className="bg-primary-50 rounded-lg p-4" role="complementary" aria-labelledby="hybrid-strategy-title">
          <h4 id="hybrid-strategy-title" className="text-sm font-semibold text-primary-700 mb-2">Hybrid Strategy</h4>
          <p className="text-xs text-primary-600">
            Combine a cloud API for initial deployment with a custom model for advanced features.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;