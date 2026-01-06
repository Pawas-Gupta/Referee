import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ComparisonPanel from './components/ComparisonPanel';
import ApiService from './services/api';

function App() {
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [backendConnected, setBackendConnected] = useState(true);

  // Check backend connectivity on app load
  useEffect(() => {
    const checkBackend = async () => {
      const isConnected = await ApiService.healthCheck();
      setBackendConnected(isConnected);
    };
    checkBackend();
  }, []);

  const handleQuestionSubmit = async (question) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await ApiService.compareApproaches(question);
      setAnalysisData(data);
      setBackendConnected(true);
    } catch (err) {
      setError(err.message);
      setBackendConnected(false);
      console.error('Error fetching analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Backend Connection Status */}
      {!backendConnected && !loading && (
        <div className="fixed top-0 left-0 right-0 bg-danger-500 text-white p-2 text-center text-sm z-50">
          Backend server is not responding. Please make sure it's running on port 3000.
        </div>
      )}
      
      <Sidebar 
        onQuestionSubmit={handleQuestionSubmit}
        loading={loading}
        error={error}
        backendConnected={backendConnected}
      />
      <ComparisonPanel 
        data={analysisData}
        loading={loading}
        error={error}
      />
    </div>
  );
}

export default App;