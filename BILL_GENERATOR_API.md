# 🎤 Voice-to-Bill Generator API

A powerful backend API for converting voice input to structured bills using Google Gemini AI, specifically designed for Indian restaurants with support for both English and Tamil languages.

## 🚀 Features

- **Voice Input Processing**: Converts natural language voice input to structured bills
- **Multi-language Support**: Handles both English and Tamil item names
- **AI-Powered**: Uses Google Gemini AI for intelligent text processing
- **Indian Restaurant Focus**: Pre-configured with popular Indian menu items
- **Flexible Menu Management**: Add, update, and manage menu items
- **Bill Tracking**: Complete order lifecycle management

## 🏗️ Architecture

```
Voice Input → Gemini AI Processing → Bill Generation → Database Storage
     ↓              ↓                    ↓              ↓
Natural Text → Structured Data → Price Calculation → Bill Response
```

## 📋 API Endpoints

### Base URL
```
http://localhost:5000/api/bill
```

### 1. Bill Generation

#### Generate Bill from Voice Input
```http
POST /generate-bill
```

**Request Body:**
```json
{
  "voiceInput": "2 dosa and 1 masala dosa and 2 idly and coffee"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bill generated successfully",
  "bill": {
    "_id": "507f1f77bcf86cd799439011",
    "voiceInput": "2 dosa and 1 masala dosa and 2 idly and coffee",
    "processedText": "2 Dosa, 1 Masala Dosa, 2 Idly, 1 Coffee",
    "items": [
      {
        "itemName": "Dosa",
        "quantity": 2,
        "unitPrice": 80,
        "totalPrice": 160
      },
      {
        "itemName": "Masala Dosa",
        "quantity": 1,
        "unitPrice": 120,
        "totalPrice": 120
      },
      {
        "itemName": "Idly",
        "quantity": 2,
        "unitPrice": 25,
        "totalPrice": 50
      },
      {
        "itemName": "Coffee",
        "quantity": 1,
        "unitPrice": 20,
        "totalPrice": 20
      }
    ],
    "subtotal": 350,
    "tax": 0,
    "total": 350,
    "createdAt": "2023-12-21T10:30:56.789Z"
  }
}
```

### 2. Bill Management

#### Get All Bills
```http
GET /bills
```

#### Get Bill by ID
```http
GET /bills/:id
```



### 3. Menu Management

#### Get All Menu Items
```http
GET /menu
```

#### Add New Menu Item
```http
POST /menu
```

**Request Body:**
```json
{
  "name": "Butter Chicken",
  "tamilName": "வெண்ணெய் கோழி",
  "price": 180,
  "category": "lunch",
  "unit": "plate",
  "description": "Rich and creamy butter chicken curry"
}
```

#### Update Menu Item
```http
PUT /menu/:id
```

#### Delete Menu Item
```http
DELETE /menu/:id
```

## 🍽️ Default Menu Items

The system comes pre-configured with popular Indian restaurant items:

| Item | Tamil Name | Price (₹) | Category | Unit |
|------|------------|-----------|----------|------|
| Dosa | தோசை | 80 | Breakfast | piece |
| Idly | இட்லி | 25 | Breakfast | piece |
| Parota | பரோட்டா | 15 | Lunch | piece |
| Masala Dosa | மசாலா தோசை | 120 | Breakfast | piece |
| Coffee | காபி | 20 | Beverages | cup |
| Tea | தேநீர் | 15 | Beverages | cup |
| Sambar Rice | சாம்பார் சாதம் | 60 | Lunch | plate |
| Curd Rice | தயிர் சாதம் | 50 | Lunch | plate |
| Vada | வடை | 20 | Breakfast | piece |
| Pongal | பொங்கல் | 40 | Breakfast | plate |

## 🔧 Setup & Installation

### 1. Environment Variables
Create a `.env` file in your project root:

```env
GEMINI_API_KEY=your-gemini-api-key-here
MONGO_URI=mongodb://localhost:27017/bill-generator
PORT=5000
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

### 4. Test the API
```bash
node test-bill-generator.js
```

## 🧪 Testing

### Test Voice Inputs

The system can handle various voice input formats:

1. **Simple quantities**: "2 dosa and 1 coffee"
2. **Mixed languages**: "2 தோசை and 1 coffee"
3. **Complex orders**: "3 parota, 1 sambar rice, 2 tea"
4. **Natural language**: "I want two dosas and a cup of coffee"

### Example Test Cases

```javascript
const testInputs = [
  "2 dosa and 1 masala dosa and 2 idly and coffee",
  "3 parota and 1 sambar rice",
  "1 coffee and 2 tea",
  "2 vada and 1 pongal",
  "1 curd rice and 3 parota"
];
```

## 🎯 AI Processing Features

### Gemini AI Integration
- **Intelligent Text Parsing**: Understands natural language variations
- **Quantity Extraction**: Accurately identifies numbers and quantities
- **Item Matching**: Flexible matching with menu items
- **Price Calculation**: Automatic total calculation
- **Multi-language Support**: Handles English and Tamil seamlessly

### Processing Rules
1. **Flexible Matching**: Handles spelling variations and synonyms
2. **Quantity Detection**: Recognizes numbers in various formats
3. **Price Calculation**: Automatically calculates item and total prices
4. **Error Handling**: Graceful fallback for unclear inputs

## 📊 Database Schema

### MenuItem Model
```javascript
{
  name: String,           // English name
  tamilName: String,      // Tamil name
  price: Number,          // Price in rupees
  category: String,       // breakfast, lunch, dinner, snacks, beverages
  unit: String,           // piece, plate, cup, etc.
  isAvailable: Boolean,   // Item availability
  description: String     // Item description
}
```

### Bill Model
```javascript
{
  _id: ObjectId,          // MongoDB document ID
  voiceInput: String,     // Original voice input
  processedText: String,  // Cleaned and structured text
  items: [BillItem],      // Array of ordered items
  subtotal: Number,       // Subtotal amount
  tax: Number,            // Tax amount
  total: Number,          // Total amount
  createdAt: Date         // Creation timestamp
}
```

## 🚨 Error Handling

### Common Error Responses

#### Missing Voice Input
```json
{
  "error": "Voice input required",
  "message": "Please provide the voice input text"
}
```

#### AI Processing Error
```json
{
  "error": "AI processing error",
  "message": "Failed to process voice input. Please try again with clearer speech."
}
```

#### Invalid Bill Structure
```json
{
  "error": "Invalid bill structure from AI",
  "message": "Failed to process voice input. Please try again."
}
```

## 🔒 Security Features

- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: Built-in rate limiting for API endpoints
- **Error Sanitization**: Safe error messages in production
- **CORS Support**: Configurable cross-origin resource sharing

## 📈 Performance Optimization

- **Database Indexing**: Text search indexes on menu items
- **AI Response Caching**: Efficient Gemini AI integration
- **Async Processing**: Non-blocking bill generation
- **Connection Pooling**: Optimized database connections

## 🌟 Use Cases

1. **Restaurant POS Systems**: Quick order processing
2. **Food Delivery Apps**: Voice order input
3. **Hotel Services**: Room service ordering
4. **Catering Services**: Bulk order management
5. **Food Courts**: Multi-vendor ordering

## 🔮 Future Enhancements

- **Voice Recognition**: Direct audio input processing
- **Payment Integration**: Online payment processing
- **Inventory Management**: Stock tracking and alerts
- **Analytics Dashboard**: Sales and order analytics
- **Multi-restaurant Support**: Chain restaurant management

## 📞 Support

For technical support or feature requests, please refer to the project documentation or create an issue in the repository.

---

**Built with ❤️ for Indian Restaurants**
