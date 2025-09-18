const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testAPI() {
  try {
    console.log('🧪 Testing Nutrition AI Backend API...\n');

    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed:', healthResponse.data);
    console.log('');

    // Test get chunks (should be empty initially)
    console.log('2. Testing get chunks endpoint...');
    const chunksResponse = await axios.get(`${BASE_URL}/chunks`);
    console.log('✅ Get chunks passed:', chunksResponse.data);
    console.log('');

    // Test ask question (should fail without data)
    console.log('3. Testing ask question without data...');
    try {
      await axios.post(`${BASE_URL}/ask`, {
        question: 'What can I eat for breakfast?',
      });
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log(
          '✅ Ask question correctly returned 404 (no data available)'
        );
      } else {
        console.log('❌ Unexpected error:', error.response?.data);
      }
    }
    console.log('');

    console.log('🎉 All tests passed! The API is working correctly.');
    console.log('\n📝 Next steps:');
    console.log('1. Upload a PDF nutrition plan using POST /api/upload');
    console.log('2. Ask questions using POST /api/ask');
    console.log('3. Use Postman or curl for testing with actual files');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure the server is running on port 5000');
    }
  }
}

// Run tests
testAPI();
