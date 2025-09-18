# Generic Billing Assistant API (Tamil/Tanglish Optimized)

A flexible billing assistant optimized for Tamil language and Tanglish (Tamil-English mix) that can parse free-form text describing items for any type of shop (electronics, groceries, clothing, hardware, etc.) and convert it into structured JSON for billing.

## Features

- ✅ **Tamil Language Support**: Optimized for Tamil language and local slang variations
- ✅ **Tanglish Support**: Handles Tamil-English mixed language efficiently
- ✅ **Local Slang Handling**: Understands colloquial Tamil variations (ஒண்ணு, ரெண்டு, மூணு)
- ✅ **Voice Pricing Support**: Extracts prices from Tamil and English voice input
- ✅ **Universal Product Support**: Works with any product type (shoes, wires, dresses, groceries, etc.)
- ✅ **Smart AI Parsing**: Uses Gemini AI to understand Tamil product names and extract quantities
- ✅ **Tamil Number Detection**: Handles Tamil numbers (ஒரு, இரண்டு, மூன்று) and slang (ஒண்ணு, ரெண்டு, மூணு)
- ✅ **Price Format Support**: Handles various price formats (50 ரூபாய், 200 ரூ, 500 rupees)
- ✅ **Quantity Units**: Supports Tamil measurement units (டஜன்=12, கிலோ, லிட்டர்)
- ✅ **Name Normalization**: Converts Tamil product names to English (சிவப்பு கம்பி → Red Wires)
- ✅ **Automatic Calculations**: Calculates totalPrice and billTotal automatically
- ✅ **Clean JSON Output**: Returns structured data ready for billing systems
- ✅ **No Predefined Menu**: Works with any product without requiring a menu setup

## API Endpoint

### POST `/api/generic-bill/generate-bill`

Converts free-form text describing items into structured JSON for billing.

#### Request Body

```json
{
  "voiceInput": "ரெண்டு சிவப்பு கம்பி 50 ரூபாய், மூணு செருப்பு 200 ரூ, ஒரு சரி 500 ரூபாய்"
}
```

#### Response

**Success (200):**
```json
{
  "success": true,
  "message": "Bill generated successfully",
  "bill": {
    "_id": "generated-bill-id",
    "voiceInput": "ரெண்டு சிவப்பு கம்பி 50 ரூபாய், மூணு செருப்பு 200 ரூ, ஒரு சரி 500 ரூபாய்",
    "items": [
      {
        "name": "Red Wires",
        "quantity": 2,
        "unitPrice": 50,
        "totalPrice": 100
      },
      {
        "name": "Shoes",
        "quantity": 3,
        "unitPrice": 200,
        "totalPrice": 600
      },
      {
        "name": "Saree",
        "quantity": 1,
        "unitPrice": 500,
        "totalPrice": 500
      }
    ],
    "billTotal": 1200,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error (400):**
```json
{
  "error": "Voice input required",
  "message": "Please provide the voice input text describing the items"
}
```

**Error (422):**
```json
{
  "success": false,
  "error": "Could not parse order",
  "message": "Unable to extract items from the provided text. Please try rephrasing your order."
}
```

## Usage Examples

### Tamil Language Examples

#### Electronics Shop (Tamil with Pricing)
```bash
curl -X POST http://localhost:5000/api/generic-bill/generate-bill \
  -H "Content-Type: application/json" \
  -d '{"voiceInput": "ரெண்டு சிவப்பு கம்பி 50 ரூபாய், மூணு செருப்பு 200 ரூ, ஒரு சரி 500 ரூபாய்"}'
```

#### Grocery Store (Tamil with Pricing)
```bash
curl -X POST http://localhost:5000/api/generic-bill/generate-bill \
  -H "Content-Type: application/json" \
  -d '{"voiceInput": "ஐந்து ஆப்பிள் 20 ரூபாய், இரண்டு கிலோ அரிசி 100 ரூ, ஒரு பால் பாட்டில் 30 ரூ"}'
```

#### Tanglish (Tamil-English Mix with Pricing)
```bash
curl -X POST http://localhost:5000/api/generic-bill/generate-bill \
  -H "Content-Type: application/json" \
  -d '{"voiceInput": "மூணு டி-ஷர்ட் 300 ரூபாய், ரெண்டு ஜீன்ஸ் 800 ரூ, ஒரு ஜாக்கெட் 1200 ரூபாய்"}'
```

#### Hardware Store (Tamil Slang with Pricing)
```bash
curl -X POST http://localhost:5000/api/generic-bill/generate-bill \
  -H "Content-Type: application/json" \
  -d '{"voiceInput": "டஜன் திருகு 2 ரூபாய், ஐந்து ஆணி 1 ரூ, ரெண்டு சுத்தி 150 ரூ"}'
```

#### Mixed Pricing (Some items with prices, some without)
```bash
curl -X POST http://localhost:5000/api/generic-bill/generate-bill \
  -H "Content-Type: application/json" \
  -d '{"voiceInput": "ரெண்டு கம்பி, மூணு செருப்பு 150 ரூ, ஒரு சரி"}'
```

### English Examples

#### Electronics Shop (English)
```bash
curl -X POST http://localhost:5000/api/generic-bill/generate-bill \
  -H "Content-Type: application/json" \
  -d '{"voiceInput": "2 red wires, 3 pairs of shoes, one saree"}'
```

#### Grocery Store (English)
```bash
curl -X POST http://localhost:5000/api/generic-bill/generate-bill \
  -H "Content-Type: application/json" \
  -d '{"voiceInput": "5 apples, 2 kg rice, 1 bottle of water"}'
```

## Input Format Support

The system can understand various input formats in both Tamil and English:

### Tamil Language Support
- **Tamil Numbers**: "ரெண்டு கம்பி", "மூணு செருப்பு", "ஒரு சரி"
- **Tamil Slang**: "ஒண்ணு மொபைல்", "ரெண்டு லேப்டாப்", "மூணு கேபிள்"
- **Tamil Quantities**: "டஜன் முட்டை", "கிலோ அரிசி", "லிட்டர் பால்"
- **Tamil Descriptions**: "சிவப்பு கம்பி", "நீலம் கேபிள்", "கருப்பு மொபைல்"
- **Tamil Pricing**: "50 ரூபாய்", "200 ரூ", "ரெண்டு ரூபாய்", "மூணு ரூ"

### Tanglish (Tamil-English Mix)
- **Mixed Language**: "மூணு டி-ஷர்ட்", "ரெண்டு ஜீன்ஸ்", "ஒரு ஜாக்கெட்"
- **English with Tamil Numbers**: "ரெண்டு red wires", "மூணு shoes"
- **Mixed Pricing**: "மூணு டி-ஷர்ட் 300 ரூபாய்", "ரெண்டு ஜீன்ஸ் 800 ரூ"

### English Language Support
- **Numbers**: "2 wires", "5 apples"
- **Words**: "three t-shirts", "one laptop"
- **Quantities**: "a dozen eggs", "2 kg rice"
- **Descriptions**: "red wires", "pairs of shoes"
- **Pricing**: "50 rupees", "200 dollars", "500 euros"
- **Mixed**: "2 red wires, 3 pairs of shoes, one saree"

### Tamil Number Mappings
- **Standard Tamil**: ஒரு(1), இரண்டு(2), மூன்று(3), நான்கு(4), ஐந்து(5)
- **Slang Variations**: ஒண்ணு(1), ரெண்டு(2), மூணு(3), நாலு(4)
- **Quantity Units**: டஜன்(12), கிலோ(1kg), லிட்டர்(1L)

## Output Format

Each item in the response contains:

- `name`: Normalized product name in English (string)
- `quantity`: Number of items (integer, default 1)
- `unitPrice`: Price per unit (number or null if not provided)
- `totalPrice`: Calculated as quantity × unitPrice (number or null if unitPrice is null)
- `billTotal`: Sum of all totalPrice values (ignores null values)

### Pricing Examples

**With Prices:**
```json
{
  "name": "Red Wires",
  "quantity": 2,
  "unitPrice": 50,
  "totalPrice": 100
}
```

**Without Prices:**
```json
{
  "name": "Shoes",
  "quantity": 3,
  "unitPrice": null,
  "totalPrice": null
}
```

## Environment Requirements

- `GEMINI_API_KEY`: Required for AI-powered parsing
- `PORT`: Server port (default: 5000)

## Error Handling

- **400**: Missing or invalid input
- **422**: Unable to parse the order (try rephrasing)
- **500**: Server error

## Integration Notes

1. **Price Management**: The system leaves `unitPrice` and `totalPrice` as `null` for the shop owner to fill in
2. **Bill Calculation**: `billTotal` is calculated as the sum of all `totalPrice` values
3. **Flexibility**: Works with any product type without requiring a predefined menu
4. **AI-Powered**: Uses Gemini AI for intelligent parsing and product name normalization

## Testing

Run the demo script to see example outputs:

```bash
node demo-generic-billing.js
```

This will show the JSON output format for various input examples.
