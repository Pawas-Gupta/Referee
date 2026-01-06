import React from 'react';
import ProsConsList from './ProsConsList';
import TradeoffsBox from './TradeoffsBox';

const ApproachCard = ({ approach, chooseIf, type }) => {
  const isPrimary = type === 'primary';
  const headerColor = isPrimary ? 'bg-primary-500' : 'bg-purple-500';
  const badgeColor = isPrimary ? 'bg-primary-100 text-primary-700' : 'bg-purple-100 text-purple-700';

  return (
    <article className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden" aria-labelledby={`approach-${type}-title`}>
      {/* Header */}
      <div className={`${headerColor} text-white p-4 lg:p-6`}>
        <h3 id={`approach-${type}-title`} className="text-lg font-semibold mb-1">{approach?.title || 'Approach'}</h3>
        <p className="text-sm opacity-90">{approach?.description || 'No description available'}</p>
      </div>

      {/* Content */}
      <div className="p-4 lg:p-6 space-y-6">
        {/* Pros and Cons */}
        <ProsConsList
          pros={approach?.pros || []}
          cons={approach?.cons || []}
        />

        {/* Trade-offs */}
        <TradeoffsBox tradeoffs={approach?.tradeoffs} />

        {/* Choose This If */}
        {chooseIf && chooseIf.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Choose This If</h4>
            <div className="flex flex-wrap gap-2" role="list">
              {chooseIf.map((condition, index) => (
                <span
                  key={index}
                  role="listitem"
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${badgeColor}`}
                >
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {condition}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
};

export default ApproachCard;