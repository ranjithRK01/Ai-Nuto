/**
 * Generic Billing Assistant Controller (Tamil/Tanglish Optimized)
 * ------------------------------------------------------------------
 * - Handles any type of shop: shoes, wires, dresses, groceries, etc.
 * - Optimized for Tamil language and Tanglish (Tamil-English mix)
 * - Handles local slang and variations of Tamil speaking
 * - Uses Gemini AI to understand product names and extract quantities
 * - Returns clean JSON with normalized product names
 * - No predefined menu - works with any product type
 *
 * ENV:
 *   GEMINI_API_KEY=...
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// ------------------------------
// Config & LLM init
// ------------------------------
const MODEL_NAME = 'gemini-1.5-flash';
const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

// ------------------------------
// Tamil Number and Quantity Mapping
// ------------------------------
const TAMIL_NUMBER_MAP = new Map([
  // Basic numbers
  ['ஓர்', 1], ['ஒரு', 1], ['ஒண்ணு', 1], ['ஒண்ண', 1],
  ['இரண்டு', 2], ['ரெண்டு', 2], ['ரெண்ட', 2], ['இரண்ட', 2],
  ['மூன்று', 3], ['மூணு', 3], ['மூண', 3], ['மூன்ற', 3],
  ['நான்கு', 4], ['நாலு', 4], ['நால', 4], ['நான்க', 4],
  ['ஐந்து', 5], ['ஐந்த', 5], ['ஐந்து', 5],
  ['ஆறு', 6], ['ஆரு', 6], ['ஆற', 6],
  ['ஏழு', 7], ['ஏழ', 7],
  ['எட்டு', 8], ['எட்ட', 8],
  ['ஒன்பது', 9], ['ஒன்பத', 9],
  ['பத்து', 10], ['பத்த', 10],
  
  // Common quantities
  ['டஜன்', 12], ['டஜன', 12], ['டஜன்', 12],
  ['கிலோ', 1], ['கிலோகிராம்', 1], ['கிலோ', 1],
  ['லிட்டர்', 1], ['லிட்டர்', 1],
  ['கிலோ', 1], ['கிலோ', 1],
  
  // Slang variations
  ['ஒண்ணே', 1], ['ரெண்டே', 2], ['மூணே', 3], ['நாலே', 4],
  ['ஒண்ணு', 1], ['ரெண்டு', 2], ['மூணு', 3], ['நாலு', 4]
]);

// Tamil price and currency mappings
const TAMIL_PRICE_MAPPINGS = new Map([
  // Currency terms
  ['ரூபாய்', 'rupees'], ['ரூபா', 'rupees'], ['ரூ', 'rupees'],
  ['டாலர்', 'dollars'], ['டாலர்', 'dollars'],
  ['யூரோ', 'euros'], ['யூரோ', 'euros'],
  
  // Price indicators
  ['விலை', 'price'], ['கணக்கு', 'price'], ['தொகை', 'amount'],
  ['ஒன்றுக்கு', 'each'], ['ஒரு', 'each'], ['ஒண்ணுக்கு', 'each'],
  ['தொகை', 'total'], ['மொத்தம்', 'total'], ['கூட்டு', 'total'],
  
  // Common price phrases
  ['ரூபாய்', 'rupees'], ['ரூ', 'rupees'], ['ரூபா', 'rupees'],
  ['டாலர்', 'dollars'], ['யூரோ', 'euros']
]);

// Common Tamil product terms and their English equivalents
const TAMIL_PRODUCT_MAPPINGS = {
  // Electronics
  'கம்பி': 'Wires', 'கம்பிகள்': 'Wires', 'வயர்': 'Wires', 'வயர்கள்': 'Wires',
  'கேபிள்': 'Cables', 'கேபிள்கள்': 'Cables',
  'மொபைல்': 'Mobile', 'மொபைல்கள்': 'Mobiles',
  'லேப்டாப்': 'Laptop', 'லேப்டாப்கள்': 'Laptops',
  'கம்ப்யூட்டர்': 'Computer', 'கம்ப்யூட்டர்கள்': 'Computers',
  
  // Clothing
  'சேட்டை': 'Shirt', 'சேட்டைகள்': 'Shirts',
  'பேண்ட்': 'Pants', 'பேண்ட்கள்': 'Pants',
  'ஜீன்ஸ்': 'Jeans', 'ஜீன்ஸ்கள்': 'Jeans',
  'ஜாக்கெட்': 'Jacket', 'ஜாக்கெட்கள்': 'Jackets',
  'சட்டை': 'Shirt', 'சட்டைகள்': 'Shirts',
  'பேண்ட்': 'Pants', 'பேண்ட்கள்': 'Pants',
  'செருப்பு': 'Shoes', 'செருப்புகள்': 'Shoes',
  'பூட்ஸ்': 'Boots', 'பூட்ஸ்கள்': 'Boots',
  'சரி': 'Saree', 'சரிகள்': 'Sarees',
  'பாவாடை': 'Pavada', 'பாவாடைகள்': 'Pavadas',
  'சேட்டு': 'Shirt', 'சேட்டுகள்': 'Shirts',
  
  // Groceries
  'ஆப்பிள்': 'Apples', 'ஆப்பிள்கள்': 'Apples',
  'அரிசி': 'Rice', 'ரைஸ்': 'Rice',
  'பால்': 'Milk', 'மில்க்': 'Milk',
  'வெண்ணெய்': 'Butter', 'பட்டர்': 'Butter',
  'முட்டை': 'Eggs', 'எக்ஸ்': 'Eggs',
  'ரொட்டி': 'Bread', 'ப்ரெட்': 'Bread',
  'சர்க்கரை': 'Sugar', 'சுகர்': 'Sugar',
  'உப்பு': 'Salt', 'சால்ட்': 'Salt',
  
  // Hardware
  'திருகு': 'Screws', 'திருகுகள்': 'Screws',
  'ஆணி': 'Nails', 'ஆணிகள்': 'Nails',
  'சுத்தி': 'Hammer', 'சுத்திகள்': 'Hammers',
  'பிளேடு': 'Blade', 'பிளேடுகள்': 'Blades',
  'கத்தி': 'Knife', 'கத்திகள்': 'Knives',
  
  // Common descriptors
  'சிவப்பு': 'Red', 'ரெட்': 'Red',
  'நீலம்': 'Blue', 'ப்ளூ': 'Blue',
  'பச்சை': 'Green', 'க்ரீன்': 'Green',
  'கருப்பு': 'Black', 'ப்ளாக்': 'Black',
  'வெள்ளை': 'White', 'வைட்': 'White',
  'பெரிய': 'Big', 'பிக்': 'Big',
  'சின்ன': 'Small', 'ஸ்மால்': 'Small'
};

// ------------------------------
// Tamil text preprocessing
// ------------------------------
function preprocessTamilText(input) {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .normalize('NFC') // Normalize Unicode
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width characters
    .replace(/[.,;:!?()\[\]{}"'`~@#%^*&_=+<>/\\|-]+/g, ' ') // Replace punctuation with spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

// ------------------------------
// Generic product parsing with Gemini
// ------------------------------
async function parseGenericOrder(voiceInput) {
  if (!genAI) {
    console.warn('⚠️ GEMINI_API_KEY not set; cannot parse generic orders.');
    return null;
  }

  // Preprocess the input for better Tamil handling
  const processedInput = preprocessTamilText(voiceInput);
  if (!processedInput) {
    return null;
  }

  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const prompt = `You are a billing assistant for small shops in Tamil Nadu. Parse the following customer order (Tamil/Tanglish/English) into a structured JSON format.

IMPORTANT: Handle Tamil language, Tanglish (Tamil-English mix), local slang variations, and PRICING efficiently.

RULES:
1. Extract each item mentioned with its quantity AND TOTAL PRICE (not unit price)
2. Handle Tamil numbers: ஒரு(1), இரண்டு(2), மூன்று(3), நான்கு(4), ஐந்து(5), etc.
3. Handle slang variations: ஒண்ணு(1), ரெண்டு(2), மூணு(3), நாலு(4), etc.
4. Handle Tanglish: "ரெட் வயர்" = "Red Wires", "பேண்ட்" = "Pants"
5. Normalize product names to English (e.g., "சிவப்பு கம்பி" → "Red Wires")
6. Extract TOTAL prices: "நாலு சட்ட 1600" = 4 shirts for 1600 total
7. Handle price formats: "50 ரூபாய்", "50 ரூ", "50 rupees", "50 dollars"
8. Default quantity is 1 if not mentioned
9. Default price is null if not mentioned
10. IMPORTANT: The price given is the TOTAL price for the entire quantity, not per unit
11. Set unitPrice = totalPrice / quantity (or null if totalPrice is null)
12. Set totalPrice = the given total price (or null if not provided)
13. Calculate billTotal = sum of all totalPrice values (ignore nulls)
14. Return ONLY valid JSON, no explanations

COMMON TAMIL PRODUCT MAPPINGS:
- கம்பி/வயர் = Wires, கேபிள் = Cables
- சேட்டை/சட்டை = Shirt, பேண்ட் = Pants, ஜீன்ஸ் = Jeans
- செருப்பு = Shoes, சரி = Saree
- ஆப்பிள் = Apples, அரிசி = Rice, பால் = Milk
- திருகு = Screws, ஆணி = Nails, சுத்தி = Hammer
- சிவப்பு = Red, நீலம் = Blue, பச்சை = Green

JSON FORMAT:
{
  "items": [
    {
      "name": "string (normalized product name in English)",
      "quantity": number (default 1),
      "unitPrice": null,
      "totalPrice": null
    }
  ],
  "billTotal": 0
}

EXAMPLES:
Input: "நாலு சட்ட 1600, மூணு பேண்ட் 2000"
Output: {
  "items": [
    {"name": "Shirt", "quantity": 4, "unitPrice": 400, "totalPrice": 1600},
    {"name": "Pants", "quantity": 3, "unitPrice": 666.67, "totalPrice": 2000}
  ],
  "billTotal": 3600
}

Input: "ரெண்டு சிவப்பு கம்பி 100 ரூபாய், மூணு செருப்பு 600 ரூ, ஒரு சரி 500 ரூபாய்"
Output: {
  "items": [
    {"name": "Red Wires", "quantity": 2, "unitPrice": 50, "totalPrice": 100},
    {"name": "Shoes", "quantity": 3, "unitPrice": 200, "totalPrice": 600},
    {"name": "Saree", "quantity": 1, "unitPrice": 500, "totalPrice": 500}
  ],
  "billTotal": 1200
}

Input: "ஐந்து ஆப்பிள் 100 ரூபாய், இரண்டு கிலோ அரிசி 200 ரூ, ஒரு பால் பாட்டில் 30 ரூ"
Output: {
  "items": [
    {"name": "Apples", "quantity": 5, "unitPrice": 20, "totalPrice": 100},
    {"name": "Rice", "quantity": 2, "unitPrice": 100, "totalPrice": 200},
    {"name": "Milk Bottle", "quantity": 1, "unitPrice": 30, "totalPrice": 30}
  ],
  "billTotal": 330
}

Input: "டஜன் முட்டை 60 ரூபாய், மூணு லிட்டர் பால் 180 ரூ, இரண்டு ரொட்டி 80 ரூபாய்"
Output: {
  "items": [
    {"name": "Eggs", "quantity": 12, "unitPrice": 5, "totalPrice": 60},
    {"name": "Milk", "quantity": 3, "unitPrice": 60, "totalPrice": 180},
    {"name": "Bread", "quantity": 2, "unitPrice": 40, "totalPrice": 80}
  ],
  "billTotal": 320
}

Input: "ரெண்டு கம்பி, மூணு செருப்பு 450 ரூ, ஒரு சரி"
Output: {
  "items": [
    {"name": "Wires", "quantity": 2, "unitPrice": null, "totalPrice": null},
    {"name": "Shoes", "quantity": 3, "unitPrice": 150, "totalPrice": 450},
    {"name": "Saree", "quantity": 1, "unitPrice": null, "totalPrice": null}
  ],
  "billTotal": 450
}

CUSTOMER ORDER: "${processedInput}"`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 512
      }
    });

    let text = '';
    try {
      text = result.response.text();
    } catch {
      text = (await result.response)?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    // Clean up response
    if (text.includes('```')) {
      text = text.replace(/```json\s*|```/g, '').trim();
    }

    // Extract JSON
    const match = text.match(/\{[\s\S]*\}/);
    const jsonStr = match ? match[0] : text;

    const parsed = JSON.parse(jsonStr);
    
    // Validate and sanitize the response
    if (!parsed.items || !Array.isArray(parsed.items)) {
      throw new Error('Invalid response format');
    }

    // Process each item
    const processedItems = parsed.items.map(item => {
      const name = String(item.name || '').trim();
      const quantity = Math.max(1, parseInt(item.quantity) || 1);
      const totalPrice = item.totalPrice !== undefined ? parseFloat(item.totalPrice) : null;
      const unitPrice = totalPrice !== null ? totalPrice / quantity : null;
      
      return {
        name,
        quantity,
        unitPrice: unitPrice ? Math.round(unitPrice * 100) / 100 : null, // Round to 2 decimal places
        totalPrice
      };
    }).filter(item => item.name.length > 0);

    // Calculate bill total (sum of all totalPrice values, ignore nulls)
    const billTotal = processedItems.reduce((sum, item) => {
      return sum + (item.totalPrice || 0);
    }, 0);

    return {
      items: processedItems,
      billTotal
    };

  } catch (error) {
    console.error('Error parsing generic order:', error);
    return null;
  }
}

// ------------------------------
// Public endpoints
// ------------------------------
const generateGenericBill = async (req, res) => {
  try {
    const { voiceInput } = req.body || {};
    
    if (!voiceInput || typeof voiceInput !== 'string' || !voiceInput.trim()) {
      return res.status(400).json({
        error: 'Voice input required',
        message: 'Please provide the voice input text describing the items'
      });
    }

    // Parse the order using Gemini
    const parsed = await parseGenericOrder(voiceInput);
    
    if (!parsed || !parsed.items || parsed.items.length === 0) {
      return res.status(422).json({
        success: false,
        error: 'Could not parse order',
        message: 'Unable to extract items from the provided text. Please try rephrasing your order.'
      });
    }

    // Create bill object
    const bill = {
      _id: Date.now().toString(16) + Math.random().toString(16).slice(2, 10),
      voiceInput,
      items: parsed.items,
      billTotal: parsed.billTotal,
      createdAt: new Date().toISOString()
    };

    return res.status(200).json({
      success: true,
      message: 'Bill generated successfully',
      bill
    });

  } catch (error) {
    console.error('❌ Error generating generic bill:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate bill. Please try again.'
    });
  }
};

module.exports = {
  generateGenericBill
};
