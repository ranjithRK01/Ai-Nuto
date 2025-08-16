const { GoogleGenerativeAI } = require('@google/generative-ai');
const MenuItem = require('../models/MenuItem');
const Bill = require('../models/Bill');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Hardcoded Indian hotel menu items
const DEFAULT_MENU_ITEMS = [
  { name: 'Dosa', tamilName: 'தோசை', price: 80, category: 'breakfast', unit: 'piece' },
  { name: 'Idly', tamilName: 'இட்லி', price: 25, category: 'breakfast', unit: 'piece' },
  { name: 'Parota', tamilName: 'பரோட்டா', price: 15, category: 'lunch', unit: 'piece' },
  { name: 'Masala Dosa', tamilName: 'மசாலா தோசை', price: 120, category: 'breakfast', unit: 'piece' },
  { name: 'Coffee', tamilName: 'காபி', price: 20, category: 'beverages', unit: 'cup' },
  { name: 'Tea', tamilName: 'தேநீர்', price: 15, category: 'beverages', unit: 'cup' },
  { name: 'Sambar Rice', tamilName: 'சாம்பார் சாதம்', price: 60, category: 'lunch', unit: 'plate' },
  { name: 'Curd Rice', tamilName: 'தயிர் சாதம்', price: 50, category: 'lunch', unit: 'plate' },
  { name: 'Vada', tamilName: 'வடை', price: 20, category: 'breakfast', unit: 'piece' },
  { name: 'Pongal', tamilName: 'பொங்கல்', price: 40, category: 'breakfast', unit: 'plate' }
];

// Initialize menu items if they don't exist
const initializeMenu = async () => {
  try {
    const count = await MenuItem.countDocuments();
    if (count === 0) {
      await MenuItem.insertMany(DEFAULT_MENU_ITEMS);
      console.log('✅ Default menu items initialized');
    }
  } catch (error) {
    console.error('❌ Error initializing menu:', error);
  }
};

// Process voice input and generate bill using Gemini AI
const generateBillFromVoice = async (req, res) => {
  try {
    const { voiceInput } = req.body;

    if (!voiceInput) {
      return res.status(400).json({
        error: 'Voice input required',
        message: 'Please provide the voice input text'
      });
    }

    // Get all menu items for context
    const menuItems = await MenuItem.find({ isAvailable: true });
    
    // Create context for Gemini AI
    const menuContext = menuItems.map(item => 
      `${item.name} (${item.tamilName}): ₹${item.price} per ${item.unit}`
    ).join('\n');

    // Gemini AI prompt for processing voice input
    const prompt = `You are an expert Indian restaurant bill generator. 

Available menu items:
${menuContext}

Voice input: "${voiceInput}"

Please analyze the voice input and generate a structured bill response. The voice input may contain:
- Item names in English or Tamil
- Quantities (numbers)
- Special instructions or variations

Rules:
1. Match items to the available menu (be flexible with spelling variations)
2. Extract quantities accurately
3. Calculate prices correctly
4. Handle both English and Tamil item names
5. Return response in this exact JSON format without any markdown formatting:

{
  "processedText": "cleaned and structured text",
  "items": [
    {
      "itemName": "exact menu item name",
      "quantity": number,
      "unitPrice": number,
      "totalPrice": number
    }
  ],
  "subtotal": number,
  "tax": 0,
  "total": number
}

Example voice input: "2 dosa and 1 masala dosa and 2 idly and coffee"
Expected response: Process the items, match with menu, calculate totals.

IMPORTANT: Return ONLY the raw JSON response. Do not wrap it in markdown code blocks or add any additional text.`;

    // Generate response using Gemini AI
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let responseText = response.text();
    
    // Debug: Log the raw AI response
    console.log('🤖 Raw AI Response:', responseText);
    
    // Clean the response text - remove markdown formatting if present
    if (responseText.includes('```json')) {
      responseText = responseText.replace(/```json\s*/, '').replace(/\s*```/, '');
    } else if (responseText.includes('```')) {
      responseText = responseText.replace(/```\s*/, '').replace(/\s*```/, '');
    }
    
    // Remove any remaining markdown or extra text
    responseText = responseText.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
    
    // Trim whitespace
    responseText = responseText.trim();
    
    let billData;
    try {
      billData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError.message);
      console.error('Raw AI Response:', responseText);
      
      // Try to extract JSON from the response if it contains JSON-like content
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          billData = JSON.parse(jsonMatch[0]);
          console.log('✅ Successfully extracted JSON from response');
        } catch (extractError) {
          throw new Error(`AI response parsing failed: ${parseError.message}. Raw response: ${responseText.substring(0, 200)}...`);
        }
      } else {
        throw new Error(`AI response parsing failed: ${parseError.message}. Raw response: ${responseText.substring(0, 200)}...`);
      }
    }

    // Validate bill data
    if (!billData.items || !Array.isArray(billData.items)) {
      throw new Error('Invalid bill structure from AI');
    }
    
    // Additional validation
    if (typeof billData.subtotal !== 'number' || typeof billData.total !== 'number') {
      throw new Error('Invalid price data from AI');
    }

    // Create bill document with only the fields defined in the schema
    const billDataToSave = {
      voiceInput,
      processedText: billData.processedText,
      items: billData.items,
      subtotal: billData.subtotal,
      tax: billData.tax || 0,
      total: billData.total
    };
    
    console.log('💾 Saving bill with data:', JSON.stringify(billDataToSave, null, 2));
    
    const bill = new Bill(billDataToSave);

    await bill.save();

    res.status(201).json({
      success: true,
      message: 'Bill generated successfully',
      bill: {
        _id: bill._id,
        voiceInput: bill.voiceInput,
        processedText: bill.processedText,
        items: bill.items,
        subtotal: bill.subtotal,
        tax: bill.tax,
        total: bill.total,
        createdAt: bill.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Error generating bill:', error);
    
    if (error.message.includes('Invalid bill structure')) {
      return res.status(500).json({
        error: 'AI processing error',
        message: 'Failed to process voice input. Please try again with clearer speech.'
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate bill. Please try again.'
    });
  }
};

// Get all bills
const getAllBills = async (req, res) => {
  try {
    const bills = await Bill.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      count: bills.length,
      bills
    });
  } catch (error) {
    console.error('❌ Error fetching bills:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch bills'
    });
  }
};

// Get bill by ID
const getBillById = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({
        error: 'Bill not found',
        message: 'The requested bill does not exist'
      });
    }
    res.json({
      success: true,
      bill
    });
  } catch (error) {
    console.error('❌ Error fetching bill:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch bill'
    });
  }
};



// Get all menu items
const getAllMenuItems = async (req, res) => {
  try {
    const menuItems = await MenuItem.find({ isAvailable: true }).sort({ category: 1, name: 1 });
    res.json({
      success: true,
      count: menuItems.length,
      menuItems
    });
  } catch (error) {
    console.error('❌ Error fetching menu items:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch menu items'
    });
  }
};

// Add new menu item
const addMenuItem = async (req, res) => {
  try {
    const { name, tamilName, price, category, unit, description } = req.body;

    if (!name || !price) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Name and price are required'
      });
    }

    const menuItem = new MenuItem({
      name,
      tamilName,
      price,
      category,
      unit,
      description
    });

    await menuItem.save();

    res.status(201).json({
      success: true,
      message: 'Menu item added successfully',
      menuItem
    });
  } catch (error) {
    console.error('❌ Error adding menu item:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        error: 'Duplicate item',
        message: 'A menu item with this name already exists'
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to add menu item'
    });
  }
};

// Update menu item
const updateMenuItem = async (req, res) => {
  try {
    const updates = req.body;
    delete updates._id; // Prevent ID modification

    const menuItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!menuItem) {
      return res.status(404).json({
        error: 'Menu item not found',
        message: 'The requested menu item does not exist'
      });
    }

    res.json({
      success: true,
      message: 'Menu item updated successfully',
      menuItem
    });
  } catch (error) {
    console.error('❌ Error updating menu item:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update menu item'
    });
  }
};

// Delete menu item
const deleteMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.findByIdAndDelete(req.params.id);
    
    if (!menuItem) {
      return res.status(404).json({
        error: 'Menu item not found',
        message: 'The requested menu item does not exist'
      });
    }

    res.json({
      success: true,
      message: 'Menu item deleted successfully',
      menuItem
    });
  } catch (error) {
    console.error('❌ Error deleting menu item:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete menu item'
    });
  }
};


module.exports = {
  generateBillFromVoice,
  getAllBills,
  getBillById,
  getAllMenuItems,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  initializeMenu
};
