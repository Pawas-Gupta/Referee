import React from 'react';
import ApproachCard from './ApproachCard';
import RecommendationFooter from './RecommendationFooter';

const ComparisonPanel = ({ data, loading, error }) => {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" aria-hidden="true"></div>
          <p className="text-gray-600" aria-live="polite">Analyzing your question...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center max-w-md" role="alert">
          <div className="w-12 h-12 bg-danger-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-danger-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h3>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Ask a Question</h3>
          <p className="text-gray-600">Enter your project or decision question to get a detailed comparison of approaches.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 overflow-auto" role="main" aria-label="Analysis results">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        {/* Problem Summary */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 lg:p-6" aria-labelledby="problem-summary">
          <h2 id="problem-summary" className="text-lg font-semibold text-gray-900 mb-3">Problem Summary</h2>
          <p className="text-gray-700 leading-relaxed">{data.problem_summary}</p>
        </section>

        {/* Approach Comparison */}
        <section aria-labelledby="approach-comparison">
          <h2 id="approach-comparison" className="sr-only">Approach Comparison</h2>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ApproachCard
              approach={data.primary_approach}
              chooseIf={data.when_to_choose?.choose_primary_if || []}
              type="primary"
            />
            <ApproachCard
              approach={data.alternative_approach}
              chooseIf={data.when_to_choose?.choose_alternative_if || []}
              type="alternative"
            />
          </div>
        </section>

        {/* Recommendation Footer */}
        <RecommendationFooter
          hybridStrategy={data.optional_hybrid_strategy}
          finalRecommendation={data.final_recommendation}
        />
      </div>
    </main>
  );
};

export default ComparisonPanel;