import React from 'react';

const RecommendationFooter = ({ hybridStrategy, finalRecommendation }) => {
  return (
    <div className="space-y-4">
      {/* Hybrid Strategy */}
      {hybridStrategy && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-indigo-900 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
            Optional Hybrid Strategy
          </h3>
          <p className="text-indigo-800 leading-relaxed">{hybridStrategy}</p>
        </div>
      )}

      {/* Final Recommendation */}
      {finalRecommendation && (
        <div className="bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Final Recommendation
          </h3>
          <p className="text-white/90 leading-relaxed text-lg">{finalRecommendation}</p>
        </div>
      )}
    </div>
  );
};

export default RecommendationFooter;