const express = require('express');
const multer = require('multer');
const path = require('path');
const rateLimit = require('express-rate-limit');
const {
  uploadPlan,
  askQuestion,
  getCurrentPlanInfo,
  clearPlan,
  healthCheck,
} = require('../controllers/nutritionController');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    cb(null, 'nutrition-plan-' + uniqueSuffix + extension);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Allow PDF, DOCX, DOC, and text files
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
    ];

    const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt'];
    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (
      allowedMimeTypes.includes(file.mimetype) ||
      allowedExtensions.includes(fileExtension)
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOCX, DOC, and text files are allowed'), false);
    }
  },
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB limit
  },
});

// Rate limiting configuration
const uploadLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10, // 10 uploads per window
  message: {
    error: 'Too many upload requests',
    message: 'Please wait before uploading another nutrition plan.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const questionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 questions per minute
  message: {
    error: 'Too many questions',
    message: 'Please wait before asking another question.',
    retryAfter: '1 minute',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Routes
router.get('/health', healthCheck);

// Plan management routes
router.post('/upload-plan', uploadLimiter, upload.single('plan'), uploadPlan);
router.get('/plan', getCurrentPlanInfo);
router.delete('/plan', clearPlan);

// Question and answer routes
router.post('/ask', questionLimiter, askQuestion);

// API documentation route
router.get('/', (req, res) => {
  res.json({
    message: 'Nutrition AI MVP API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      uploadPlan: 'POST /upload-plan',
      getPlan: 'GET /plan',
      clearPlan: 'DELETE /plan',
      askQuestion: 'POST /ask',
    },
    fileTypes: ['PDF', 'DOCX', 'DOC', 'TXT'],
    maxFileSize: '10MB',
    rateLimits: {
      uploads: '10 per 15 minutes',
      questions: '30 per minute',
    },
    instructions: {
      upload:
        'Upload a nutrition plan file using multipart/form-data with field name "plan"',
      ask: 'Send a JSON body with "question" field to get AI-powered answers about your plan',
    },
  });
});

module.exports = router;
