require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const connectDB = require('./config/db');
const nutritionRoutes = require('./routes/nutritionRoutes');
const billRoutes = require('./routes/billRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Check required environment variables
const requiredEnvVars = ['GEMINI_API_KEY', 'MONGO_URI'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.log('\n💡 Please create a .env file with the required variables.');
  console.log('📝 Example .env file:');
  console.log('   GEMINI_API_KEY=your-gemini-api-key-here');
  console.log('   MONGO_URI=mongodb://localhost:27017/nutrition-ai');
  process.exit(1);
}

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// API routes
app.use('/api', nutritionRoutes);
app.use('/api/bill', billRoutes);

// Root route with API documentation
app.get('/', (req, res) => {
  res.json({
    message: 'Human-Friendly Nutrition AI MVP Backend',
    version: '1.0.0',
    description: 'Simple, friendly nutrition specialist AI that gives short, clear answers based on meal plans',
    features: [
      'PDF/DOCX/TXT file upload and parsing',
      'MongoDB vector search and storage',
      'Short, simple answers (max 3 lines)',
      'Human-friendly language',
      'Rate limiting and security',
      'Persistent meal plan management'
    ],
    aiStyle: [
      'Short and simple answers',
      'Everyday language - no jargon',
      'Direct and clear responses',
      'Confident yes/no answers',
      'Practical alternatives',
      'Encouraging and helpful tone'
    ],
    api: {
      baseUrl: '/api',
      documentation: '/api',
      health: '/api/health',
      upload: '/api/upload-plan',
      ask: '/api/ask',
      plan: '/api/plan',
      bill: '/api/bill'
    },
    deployment: {
      frontend: 'React (Vercel)',
      backend: 'Node.js + Express (Railway/Render)',
      database: 'MongoDB (Atlas/Local)',
      ai: 'Google Gemini AI - Human-Friendly Nutrition Specialist'
    },
    status: 'Ready for MVP development'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  if (error.name === 'MulterError') {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: 'The uploaded file exceeds the maximum allowed size.',
        maxSize: '10MB'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: 'Invalid file field',
        message: 'Please use the field name "plan" for file uploads.',
        correctFormat: 'multipart/form-data with field name "plan"'
      });
    }
    return res.status(400).json({
      error: 'File upload error',
      message: error.message
    });
  }
  
  if (error.name === 'RateLimitExceeded') {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter: error.retryAfter
    });
  }
  
  res.status(500).json({
    error: 'Internal server error',
    message: 'Something went wrong. Please try again.',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `The endpoint ${req.originalUrl} does not exist.`,
    availableEndpoints: [
      'GET /',
      'GET /api/health',
      'POST /api/upload-plan',
      'GET /api/plan',
      'DELETE /api/plan',
      'POST /api/ask',
      'POST /api/bill/generate-bill',
      'GET /api/bill/bills',
      'GET /api/bill/menu'
    ]
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Human-Friendly Nutrition AI MVP Backend running on port ${PORT}`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/api`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: MongoDB (${process.env.MONGO_URI ? 'Configured' : 'Not configured'})`);
  console.log(`🤖 AI Model: Google Gemini AI - Human-Friendly Nutrition Specialist`);
  
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️  Warning: GEMINI_API_KEY not set. AI features will not work.');
  }
  
  if (!process.env.MONGO_URI) {
    console.warn('⚠️  Warning: MONGO_URI not set. Database features will not work.');
  }
});

module.exports = app; 