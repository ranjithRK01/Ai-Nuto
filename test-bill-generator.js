const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/bill';

// Test data for voice inputs
const testVoiceInputs = [
  '2 dosa and 1 masala dosa and 2 idly and coffee',
  '3 parota and 1 sambar rice',
  '1 coffee and 2 tea',
  '2 vada and 1 pongal',
  '1 curd rice and 3 parota',
];

// Test the bill generation API
async function testBillGeneration() {
  console.log('🧪 Testing Bill Generator API\n');

  try {
    // Test 1: Get menu items
    console.log('📋 Test 1: Getting menu items...');
    const menuResponse = await axios.get(`${BASE_URL}/menu`);
    console.log(
      '✅ Menu items:',
      menuResponse.data.menuItems.length,
      'items found'
    );
    console.log('📝 Sample items:');
    menuResponse.data.menuItems.slice(0, 3).forEach((item) => {
      console.log(`   - ${item.name} (${item.tamilName}): ₹${item.price}`);
    });
    console.log('');

    // Test 2: Generate bills from voice inputs
    console.log('🎤 Test 2: Generating bills from voice inputs...\n');

    for (let i = 0; i < testVoiceInputs.length; i++) {
      const voiceInput = testVoiceInputs[i];
      console.log(`🎯 Test ${i + 1}: "${voiceInput}"`);

      try {
        const billResponse = await axios.post(`${BASE_URL}/generate-bill`, {
          voiceInput,
        });

        const bill = billResponse.data.bill;
        console.log('✅ Bill generated successfully!');
        console.log(`   📄 Bill ID: ${bill._id}`);
        console.log(`   💰 Total: ₹${bill.total}`);
        console.log(`   📝 Processed: "${bill.processedText}"`);
        console.log(`   🍽️  Items: ${bill.items.length} items`);
        bill.items.forEach((item) => {
          console.log(
            `      - ${item.quantity}x ${item.itemName}: ₹${item.totalPrice}`
          );
        });
        console.log('');

        // Wait a bit between requests to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.log(
          '❌ Error generating bill:',
          error.response?.data?.message || error.message
        );
        console.log('');
      }
    }

    // Test 3: Get all bills
    console.log('📊 Test 3: Getting all generated bills...');
    const billsResponse = await axios.get(`${BASE_URL}/bills`);
    console.log(`✅ Total bills: ${billsResponse.data.count}`);
    console.log('📋 Recent bills:');
    billsResponse.data.bills.slice(0, 3).forEach((bill) => {
      console.log(`   - ${bill._id}: ₹${bill.total} - "${bill.voiceInput}"`);
    });
    console.log('');

    // Test 4: Display bill details
    if (billsResponse.data.bills.length > 0) {
      const firstBill = billsResponse.data.bills[0];
      console.log('📋 Test 4: Displaying bill details...');
      console.log(`   Bill ID: ${firstBill._id}`);
      console.log(`   Voice Input: "${firstBill.voiceInput}"`);
      console.log(`   Total Amount: ₹${firstBill.total}`);
      console.log(
        `   Created: ${new Date(firstBill.createdAt).toLocaleString()}`
      );
    }
  } catch (error) {
    console.error(
      '❌ Test failed:',
      error.response?.data?.message || error.message
    );
  }
}

// Test menu management
async function testMenuManagement() {
  console.log('\n🍽️  Testing Menu Management API\n');

  try {
    // Test adding a new menu item
    console.log('➕ Test: Adding new menu item...');
    const newItem = {
      name: 'Butter Chicken',
      tamilName: 'வெண்ணெய் கோழி',
      price: 180,
      category: 'lunch',
      unit: 'plate',
      description: 'Rich and creamy butter chicken curry',
    };

    const addResponse = await axios.post(`${BASE_URL}/menu`, newItem);
    console.log('✅ New item added:', addResponse.data.menuItem.name);
    console.log('');

    // Test updating the item
    console.log('✏️  Test: Updating menu item...');
    const updateResponse = await axios.put(
      `${BASE_URL}/menu/${addResponse.data.menuItem._id}`,
      {
        price: 200,
        description: 'Updated description',
      }
    );
    console.log(
      '✅ Item updated:',
      updateResponse.data.menuItem.name,
      'Price: ₹',
      updateResponse.data.menuItem.price
    );
    console.log('');

    // Test deleting the item
    console.log('🗑️  Test: Deleting menu item...');
    await axios.delete(`${BASE_URL}/menu/${addResponse.data.menuItem._id}`);
    console.log('✅ Item deleted successfully');
  } catch (error) {
    console.error(
      '❌ Menu management test failed:',
      error.response?.data?.message || error.message
    );
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Bill Generator API Tests\n');
  console.log('='.repeat(50));

  await testBillGeneration();
  await testMenuManagement();

  console.log('='.repeat(50));
  console.log('✨ All tests completed!');
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get('http://localhost:5000/api/health');
    console.log('✅ Server is running, starting tests...\n');
    await runTests();
  } catch (error) {
    console.error('❌ Server is not running. Please start the server first:');
    console.log('   npm run dev');
    console.log('   or');
    console.log('   npm start');
  }
}

checkServer();
