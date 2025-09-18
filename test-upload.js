const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

// Test configuration
const API_BASE_URL = 'http://localhost:5000/api';
const TEST_FILE_PATH = './test-nutrition-plan.txt'; // We'll use the existing text file

async function testUpload() {
  try {
    console.log('🧪 Testing Nutrition AI Backend...\n');

    // Test 1: Health Check
    console.log('1️⃣ Testing Health Check...');
    try {
      const healthResponse = await axios.get(`${API_BASE_URL}/health`);
      console.log('✅ Health Check:', healthResponse.data);
    } catch (error) {
      console.log(
        '❌ Health Check Failed:',
        error.response?.data || error.message
      );
    }

    // Test 2: Upload Plan
    console.log('\n2️⃣ Testing Plan Upload...');

    // Check if test file exists
    if (!fs.existsSync(TEST_FILE_PATH)) {
      console.log(
        '⚠️  Test file not found. Creating a sample nutrition plan...'
      );

      const samplePlan = `NUTRITION PLAN

BREAKFAST (7:00 AM)
- 1 cup oatmeal with 1/2 cup berries
- 1 tablespoon honey
- 1 cup almond milk
- 1 banana

LUNCH (12:00 PM)
- Grilled chicken breast (4 oz)
- 1 cup brown rice
- 1 cup steamed broccoli
- 1 tablespoon olive oil

SNACK (3:00 PM)
- 1 apple with 1 tablespoon peanut butter
- 1 cup green tea

DINNER (7:00 PM)
- Baked salmon (4 oz)
- 1 cup quinoa
- 1 cup mixed vegetables
- 1 tablespoon lemon juice

WATER INTAKE
- 8-10 glasses of water daily
- Avoid sugary drinks

RESTRICTIONS
- No processed foods
- Limit salt intake
- Avoid fried foods
- No alcohol`;

      fs.writeFileSync(TEST_FILE_PATH, samplePlan);
      console.log('✅ Sample nutrition plan created');
    }

    // Create form data with correct field name
    const formData = new FormData();
    formData.append('plan', fs.createReadStream(TEST_FILE_PATH));

    const uploadResponse = await axios.post(
      `${API_BASE_URL}/upload-plan`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    console.log('✅ Upload Successful:', uploadResponse.data);

    // Test 3: Get Current Plan
    console.log('\n3️⃣ Testing Get Current Plan...');
    try {
      const planResponse = await axios.get(`${API_BASE_URL}/plan`);
      console.log('✅ Current Plan:', planResponse.data);
    } catch (error) {
      console.log('❌ Get Plan Failed:', error.response?.data || error.message);
    }

    // Test 4: Ask Question
    console.log('\n4️⃣ Testing Question Answering...');
    try {
      const questionResponse = await axios.post(`${API_BASE_URL}/ask`, {
        question: 'What should I eat for breakfast?',
      });
      console.log('✅ Question Answer:', questionResponse.data);
    } catch (error) {
      console.log('❌ Question Failed:', error.response?.data || error.message);
    }

    // Test 5: Ask Another Question
    console.log('\n5️⃣ Testing Another Question...');
    try {
      const questionResponse2 = await axios.post(`${API_BASE_URL}/ask`, {
        question: 'Are there any food restrictions in my plan?',
      });
      console.log('✅ Second Question Answer:', questionResponse2.data);
    } catch (error) {
      console.log(
        '❌ Second Question Failed:',
        error.response?.data || error.message
      );
    }

    console.log('\n🎉 All tests completed!');
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);

    if (error.response?.status === 500) {
      console.log('\n💡 Troubleshooting tips:');
      console.log('1. Make sure MongoDB is running');
      console.log('2. Check your .env file has correct OPENAI_API_KEY');
      console.log('3. Ensure the server is running on port 5000');
    }
  }
}

// Run the test
testUpload();
