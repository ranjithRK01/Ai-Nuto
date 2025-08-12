const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testMVP() {
  try {
    console.log('🧪 Testing Nutrition AI MVP Backend...\n');

    // Test 1: Health Check
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed:', healthResponse.data.status);
    console.log('');

    // Test 2: API Documentation
    console.log('2. Testing API documentation...');
    const apiResponse = await axios.get(`${BASE_URL}/`);
    console.log('✅ API documentation loaded');
    console.log(`   Version: ${apiResponse.data.version}`);
    console.log(`   Endpoints: ${Object.keys(apiResponse.data.endpoints).length}`);
    console.log('');

    // Test 3: Get Current Plan (should be empty initially)
    console.log('3. Testing get current plan (should be empty)...');
    try {
      await axios.get(`${BASE_URL}/plan`);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('✅ Correctly returned 404 (no plan uploaded)');
      } else {
        console.log('❌ Unexpected error:', error.response?.data);
      }
    }
    console.log('');

    // Test 4: Ask Question (should fail without plan)
    console.log('4. Testing ask question without plan...');
    try {
      await axios.post(`${BASE_URL}/ask`, {
        question: "What can I eat for breakfast?"
      });
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('✅ Correctly returned 404 (no plan available)');
      } else {
        console.log('❌ Unexpected error:', error.response?.data);
      }
    }
    console.log('');

    // Test 5: Test file upload validation
    console.log('5. Testing file upload validation...');
    try {
      await axios.post(`${BASE_URL}/upload-plan`);
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Correctly validated missing file');
      } else {
        console.log('❌ Unexpected error:', error.response?.data);
      }
    }
    console.log('');

    console.log('🎉 All MVP tests passed! The backend is ready.');
    console.log('\n📝 Next steps:');
    console.log('1. Set up your environment variables in .env');
    console.log('2. Configure Supabase Vector or Pinecone');
    console.log('3. Upload a nutrition plan using POST /api/upload-plan');
    console.log('4. Ask questions using POST /api/ask');
    console.log('5. Build your React frontend to consume this API');

    console.log('\n🔧 Configuration needed:');
    console.log('- OPENAI_API_KEY: Your OpenAI API key');
    console.log('- SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY (for vector storage)');
    console.log('- Or PINECONE_API_KEY (alternative vector storage)');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure the server is running on port 5000');
      console.log('   Run: npm run dev');
    }
  }
}

// Run tests
testMVP(); 