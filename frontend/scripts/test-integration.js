#!/usr/bin/env node

// Simple integration test script
// Run with: node scripts/test-integration.js

const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3000';

async function testIntegration() {
  console.log('🔍 Testing Trade-Off Referee Integration...\n');
  
  try {
    // Test 1: Health check
    console.log('1. Testing backend connectivity...');
    try {
      const healthResponse = await fetch(`${API_BASE_URL}/health`);
      if (healthResponse.ok) {
        console.log('   ✅ Backend server is running');
      } else {
        console.log('   ❌ Backend server responded with error');
        return false;
      }
    } catch (error) {
      console.log('   ❌ Cannot connect to backend server');
      console.log('💡 Make sure backend is running: npm start (in root directory)');
      return false;
    }
    
    // Test 2: API endpoint test
    console.log('\n2. Testing /compare endpoint...');
    const testQuestion = 'Should I use MySQL or PostgreSQL for my database?';
    
    const response = await fetch(`${API_BASE_URL}/api/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question: testQuestion }),
    });
    
    if (!response.ok) {
      console.log(`   ❌ API returned error: ${response.status}`);
      return false;
    }
    
    const data = await response.json();
    
    // Test 3: Response structure validation
    console.log('\n3. Validating response structure...');
    const requiredFields = [
      'problem_summary',
      'primary_approach',
      'alternative_approach',
      'when_to_choose',
      'final_recommendation'
    ];
    
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      console.log(`   ❌ Missing required fields: ${missingFields.join(', ')}`);
      return false;
    }
    
    console.log('   ✅ Response structure is valid');
    
    // Test 4: Content validation
    console.log('\n4. Validating response content...');
    
    if (!data.primary_approach.title || !data.alternative_approach.title) {
      console.log('   ❌ Approaches missing titles');
      return false;
    }
    
    if (!Array.isArray(data.primary_approach.pros) || !Array.isArray(data.alternative_approach.cons)) {
      console.log('   ❌ Pros/cons are not arrays');
      return false;
    }
    
    console.log('   ✅ Response content is valid');
    console.log(`   📝 Problem: ${data.problem_summary.substring(0, 80)}...`);
    console.log(`   🎯 Primary: ${data.primary_approach.title}`);
    console.log(`   🔄 Alternative: ${data.alternative_approach.title}`);
    
    console.log('\n🎉 All integration tests passed!');
    console.log('💡 You can now start the frontend with: npm start (in frontend directory) - it will run on port 3001');
    
    return true;
    
  } catch (error) {
    console.log(`\n❌ Integration test failed: ${error.message}`);
    return false;
  }
}

// Run the test
testIntegration().then(success => {
  process.exit(success ? 0 : 1);
});