# Nutrition AI Backend - Usage Guide

## 🚀 Getting Started

### 1. Setup Environment
```bash
# Copy environment file
cp env.example .env

# Edit .env and add your OpenAI API key
OPENAI_API_KEY=sk-your-actual-api-key-here
```

### 2. Start MongoDB
Make sure MongoDB is running on your system or use MongoDB Atlas.

### 3. Start the Server
```bash
npm run dev
```

Server will start on `http://localhost:5000`

## 📋 API Testing Guide

### Using Postman

#### 1. Health Check
- **Method**: GET
- **URL**: `http://localhost:5000/api/health`
- **Expected Response**: Server status

#### 2. Upload PDF
- **Method**: POST
- **URL**: `http://localhost:5000/api/upload`
- **Body**: form-data
- **Key**: `pdf` (File type)
- **Value**: Select your nutrition plan PDF
- **Expected Response**: Processing results

#### 3. Ask Question
- **Method**: POST
- **URL**: `http://localhost:5000/api/ask`
- **Headers**: `Content-Type: application/json`
- **Body**: raw (JSON)
```json
{
  "question": "What foods should I avoid?"
}
```

#### 4. View Chunks (Debug)
- **Method**: GET
- **URL**: `http://localhost:5000/api/chunks`

#### 5. Clear Data (Testing)
- **Method**: DELETE
- **URL**: `http://localhost:5000/api/chunks`

### Using curl

#### Health Check
```bash
curl http://localhost:5000/api/health
```

#### Upload PDF
```bash
curl -X POST \
  http://localhost:5000/api/upload \
  -F "pdf=@/path/to/your/nutrition-plan.pdf"
```

#### Ask Question
```bash
curl -X POST \
  http://localhost:5000/api/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "Can I eat rice during lunch?"}'
```

#### View Chunks
```bash
curl http://localhost:5000/api/chunks
```

#### Clear Data
```bash
curl -X DELETE http://localhost:5000/api/chunks
```

## 🧪 Testing Workflow

### 1. Initial Setup
```bash
# Start the server
npm run dev

# In another terminal, run the test script
node test-api.js
```

### 2. Upload a Nutrition Plan
1. Prepare a PDF nutrition plan
2. Use Postman or curl to upload it
3. Verify the response shows chunks were created

### 3. Ask Questions
1. Ask specific questions about the nutrition plan
2. Test various types of questions:
   - "What can I eat for breakfast?"
   - "Are there any foods I should avoid?"
   - "What's my recommended protein intake?"
   - "Can I have snacks between meals?"

### 4. Debug and Monitor
- Use `/api/chunks` to see stored data
- Check similarity scores in responses
- Monitor console logs for processing details

## 📊 Expected Responses

### Successful PDF Upload
```json
{
  "success": true,
  "message": "PDF processed successfully",
  "chunksStored": 15,
  "totalTextLength": 8500
}
```

### Successful Question Answer
```json
{
  "success": true,
  "question": "Can I eat rice during lunch?",
  "answer": "Based on your nutrition plan, rice is allowed during lunch...",
  "relevantChunks": 3,
  "similarityScores": [0.85, 0.72, 0.68]
}
```

### Error Responses
```json
{
  "error": "No PDF file uploaded"
}
```

```json
{
  "error": "No nutrition plan data found. Please upload a PDF first."
}
```

## 🔧 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check connection string in `.env`

2. **OpenAI API Error**
   - Verify API key is correct
   - Check API key has sufficient credits

3. **File Upload Issues**
   - Ensure file is PDF format
   - Check file size (max 10MB)
   - Verify `uploads/` directory exists

4. **Server Won't Start**
   - Check if port 5000 is available
   - Verify all dependencies are installed
   - Check `.env` file exists

### Debug Commands

```bash
# Check if server is running
curl http://localhost:5000/api/health

# View all stored chunks
curl http://localhost:5000/api/chunks

# Clear all data and start fresh
curl -X DELETE http://localhost:5000/api/chunks
```

## 📈 Performance Tips

1. **Large PDFs**: The system can handle large documents but processing time increases
2. **Question Quality**: More specific questions get better answers
3. **Chunk Overlap**: 100-character overlap helps maintain context
4. **Similarity Threshold**: Top 3 chunks are used for context

## 🎯 Example Questions to Test

- "What's my daily calorie target?"
- "Can I eat fruits?"
- "What should I drink?"
- "Are there any restrictions?"
- "What's the meal timing?"
- "Can I have desserts?"
- "What protein sources are recommended?"
- "How much water should I drink?"

---

**Happy testing! 🚀** 