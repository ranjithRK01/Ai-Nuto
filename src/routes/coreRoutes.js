const express = require('express');
const multer = require('multer');
const path = require('path');
const {
  uploadPDF,
  askQuestion,
  getAllChunks,
  clearAllChunks
} = require('../controllers/core');

const router = express.Router();

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'nutrition-plan-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Only allow PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024 // 10MB limit
  }
});

// Routes
router.post('/upload', upload.single('pdf'), uploadPDF);
router.post('/ask', askQuestion);
router.get('/chunks', getAllChunks);
router.delete('/chunks', clearAllChunks);

// Health check route
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Nutrition AI Backend is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 