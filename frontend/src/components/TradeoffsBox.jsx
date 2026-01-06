import React from 'react';

const TradeoffsBox = ({ tradeoffs }) => {
  if (!tradeoffs) {
    return null;
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center">
        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
        </svg>
        Trade-Offs
      </h4>
      <p className="text-sm text-amber-700 leading-relaxed">{tradeoffs}</p>
    </div>
  );
};

export default TradeoffsBox;