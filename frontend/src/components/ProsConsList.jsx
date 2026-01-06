import React from 'react';

const ProsConsList = ({ pros, cons }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Pros */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
          <div className="w-4 h-4 bg-success-500 rounded-full flex items-center justify-center mr-2">
            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          Pros
        </h4>
        <ul className="space-y-2">
          {pros && pros.length > 0 ? (
            pros.map((pro, index) => (
              <li key={index} className="flex items-start">
                <div className="w-4 h-4 bg-success-100 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                  <svg className="w-2.5 h-2.5 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm text-gray-700">{pro}</span>
              </li>
            ))
          ) : (
            <li className="text-sm text-gray-500 italic">No pros listed</li>
          )}
        </ul>
      </div>

      {/* Cons */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
          <div className="w-4 h-4 bg-danger-500 rounded-full flex items-center justify-center mr-2">
            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
          Cons
        </h4>
        <ul className="space-y-2">
          {cons && cons.length > 0 ? (
            cons.map((con, index) => (
              <li key={index} className="flex items-start">
                <div className="w-4 h-4 bg-danger-100 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                  <svg className="w-2.5 h-2.5 text-danger-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm text-gray-700">{con}</span>
              </li>
            ))
          ) : (
            <li className="text-sm text-gray-500 italic">No cons listed</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default ProsConsList;