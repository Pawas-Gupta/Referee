// Integration test utility to verify frontend-backend connectivity
// This can be run manually to test the complete system

import ApiService from '../services/api';

export const testBackendIntegration = async () => {
  console.log('🔍 Testing backend integration...');
  
  try {
    // Test 1: Health check
    console.log('1. Testing health check...');
    const healthCheck = await ApiService.healthCheck();
    console.log(`   Health check: ${healthCheck ? '✅ PASS' : '❌ FAIL'}`);
    
    if (!healthCheck) {
      console.log('   ⚠️  Backend server may not be running on port 3001');
      return false;
    }
    
    // Test 2: API call with sample question
    console.log('2. Testing API call...');
    const testQuestion = 'Should I use React or Vue for my frontend?';
    const response = await ApiService.compareApproaches(testQuestion);
    
    // Verify response structure
    const requiredFields = [
      'problem_summary',
      'primary_approach',
      'alternative_approach',
      'when_to_choose',
      'final_recommendation'
    ];
    
    const missingFields = requiredFields.filter(field => !response[field]);
    
    if (missingFields.length > 0) {
      console.log(`   ❌ FAIL - Missing fields: ${missingFields.join(', ')}`);
      return false;
    }
    
    console.log('   ✅ PASS - API response has correct structure');
    console.log(`   📝 Problem Summary: ${response.problem_summary.substring(0, 100)}...`);
    console.log(`   🎯 Primary: ${response.primary_approach.title}`);
    console.log(`   🔄 Alternative: ${response.alternative_approach.title}`);
    
    console.log('🎉 All integration tests passed!');
    return true;
    
  } catch (error) {
    console.log(`   ❌ FAIL - Error: ${error.message}`);
    console.log('   💡 Make sure the backend server is running with: npm start');
    return false;
  }
};

// Run tests if this file is executed directly
if (require.main === module) {
  testBackendIntegration();
}