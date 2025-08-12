const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const Chunk = require('../models/Chunk');
const { generateEmbedding, generateEmbeddings } = require('../utils/embed');
const { findTopSimilarChunks } = require('../utils/similarity');
const { chunkText, cleanText, generateChunkId } = require('../utils/textProcessor');
const { parsePDF, validatePDF } = require('../utils/simplePdfParser');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Upload and process PDF file
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const uploadPDF = async (req, res) => {
  try {
    console.log('Uploading PDF...');
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const filePath = req.file.path;
    
    // Read file buffer
    const dataBuffer = fs.readFileSync(filePath);
    
    // Validate PDF
    try {
      validatePDF(dataBuffer);
    } catch (validationError) {
      // Clean up file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      return res.status(400).json({ 
        error: 'Invalid PDF file',
        details: validationError.message
      });
    }
    
    // Parse PDF
    let pdfData;
    try {
      pdfData = await parsePDF(dataBuffer);
    } catch (pdfError) {
      console.error('PDF parsing error:', pdfError);
      
      // Clean up file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      return res.status(400).json({ 
        error: 'Failed to parse PDF file',
        details: 'The PDF file may be corrupted, password-protected, or in an unsupported format. Please try with a different PDF file or convert it to a different format.',
        technicalError: pdfError.message,
        suggestions: [
          'Try opening the PDF in a PDF viewer and re-saving it',
          'Convert the PDF to a different format and back to PDF',
          'Use a different PDF file for testing',
          'Ensure the PDF contains selectable text (not just images)'
        ]
      });
    }
    
    // Check if PDF has text content
    if (!pdfData.text || pdfData.text.trim().length === 0) {
      // Clean up file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      return res.status(400).json({ 
        error: 'No text content found in PDF',
        details: 'The PDF appears to be empty or contains only images. Please upload a PDF with text content.',
        suggestions: [
          'Ensure the PDF contains selectable text (not just images)',
          'Try copying text from the PDF to verify it has text content',
          'Use OCR software to extract text from image-based PDFs'
        ]
      });
    }
    
    // Clean and chunk the text
    const cleanedText = cleanText(pdfData.text);
    const textChunks = chunkText(cleanedText, 500, 100);
    
    if (textChunks.length === 0) {
      return res.status(400).json({ error: 'No text content found in PDF' });
    }
    
    console.log(`Processing ${textChunks.length} chunks from PDF...`);
    
    // Generate embeddings for all chunks
    const embeddings = await generateEmbeddings(textChunks);
    
    // Store chunks and embeddings in database
    const chunkDocuments = textChunks.map((chunk, index) => ({
      chunkId: generateChunkId(),
      text: chunk,
      embedding: embeddings[index]
    }));
    
    await Chunk.insertMany(chunkDocuments);
    
    // Clean up uploaded file
    fs.unlinkSync(filePath);
    
    res.json({
      success: true,
      message: 'PDF processed successfully',
      chunksStored: chunkDocuments.length,
      totalTextLength: cleanedText.length,
      averageChunkLength: Math.round(cleanedText.length / textChunks.length),
      pagesProcessed: pdfData.numpages || 'Unknown'
    });
    
  } catch (error) {
    console.error('Error processing PDF:', error);
    
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Failed to process PDF',
      details: error.message 
    });
  }
};

/**
 * Answer questions based on stored nutrition plan
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const askQuestion = async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Question is required and must be a string' });
    }
    
    // Generate embedding for the question
    const questionEmbedding = await generateEmbedding(question);
    
    // Get all chunks from database
    const chunks = await Chunk.find({});
    
    if (chunks.length === 0) {
      return res.status(404).json({ error: 'No nutrition plan data found. Please upload a PDF first.' });
    }
    
    // Find top 3 most similar chunks
    const topChunks = findTopSimilarChunks(questionEmbedding, chunks, 3);
    
    if (topChunks.length === 0) {
      return res.status(404).json({ error: 'No relevant information found for this question' });
    }
    
    // Build context from relevant chunks
    const context = topChunks.map((item, index) => 
      `[Chunk ${index + 1}]\n${item.chunk.text}`
    ).join('\n\n');
    
    // Create prompt for GPT
    const prompt = `You are a helpful nutrition assistant answering questions based on a specific nutrition plan. Use only the information provided in the nutrition plan chunks below to answer the question. If the information is not available in the provided chunks, say so.

Nutrition Plan Information:
${context}

Question: ${question}

Please provide a clear, helpful answer based only on the nutrition plan information above:`;
    
    // Get answer from OpenAI GPT
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful nutrition assistant. Answer questions based only on the provided nutrition plan information."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    });
    
    const answer = completion.choices[0].message.content;
    
    res.json({
      success: true,
      question,
      answer,
      relevantChunks: topChunks.length,
      similarityScores: topChunks.map(item => item.similarity)
    });
    
  } catch (error) {
    console.error('Error answering question:', error);
    res.status(500).json({ 
      error: 'Failed to answer question',
      details: error.message 
    });
  }
};

/**
 * Get all stored chunks (for debugging/testing)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllChunks = async (req, res) => {
  try {
    const chunks = await Chunk.find({}, { embedding: 0 }); // Exclude embeddings for performance
    res.json({
      success: true,
      count: chunks.length,
      chunks
    });
  } catch (error) {
    console.error('Error fetching chunks:', error);
    res.status(500).json({ error: 'Failed to fetch chunks' });
  }
};

/**
 * Clear all stored chunks (for testing)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const clearAllChunks = async (req, res) => {
  try {
    await Chunk.deleteMany({});
    res.json({
      success: true,
      message: 'All chunks cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing chunks:', error);
    res.status(500).json({ error: 'Failed to clear chunks' });
  }
};

module.exports = {
  uploadPDF,
  askQuestion,
  getAllChunks,
  clearAllChunks
}; 