const fs = require('fs');
const path = require('path');
const { parseDocument, validateDocument } = require('../utils/documentParser');
const { processNutritionPlan, generatePlanId, extractNutritionInfo } = require('../utils/textProcessor');
const { storeChunks, searchChunks, clearPlanChunks, getCurrentPlan, setActivePlan } = require('../utils/mongoVectorDB');
const { generateRAGResponse, generatePlanSummary } = require('../utils/aiResponse');
const NutritionPlan = require('../models/NutritionPlan');

/**
 * Upload and process nutrition plan
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const uploadPlan = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No file uploaded',
        message: 'Please upload a PDF, DOCX, or text file containing your meal plan.'
      });
    }

    const filePath = req.file.path;
    const mimeType = req.file.mimetype;
    const filename = req.file.originalname;
    
    console.log(`📁 Processing meal plan: ${filename} (${mimeType})`);
    
    // Read file buffer
    const dataBuffer = fs.readFileSync(filePath);
    
    // Validate document
    try {
      validateDocument(dataBuffer, mimeType, filename);
    } catch (validationError) {
      // Clean up file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      return res.status(400).json({ 
        error: 'Invalid file',
        message: validationError.message,
        suggestions: [
          'Ensure the file is a valid PDF, DOCX, or text file',
          'Check that the file is not corrupted',
          'Try uploading a different file format'
        ]
      });
    }
    
    // Parse document
    let parsedData;
    try {
      parsedData = await parseDocument(dataBuffer, mimeType, filename);
    } catch (parseError) {
      // Clean up file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      return res.status(400).json({ 
        error: 'Failed to parse document',
        message: parseError.message,
        suggestions: [
          'Ensure the document contains readable text',
          'Try converting the document to a different format',
          'Check that the document is not password-protected'
        ]
      });
    }
    
    // Process nutrition plan
    const planId = generatePlanId();
    const chunks = processNutritionPlan(parsedData.text);
    const nutritionInfo = extractNutritionInfo(parsedData.text);
    
    if (chunks.length === 0) {
      // Clean up file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      return res.status(400).json({ 
        error: 'No meal plan content found',
        message: 'The document appears to be empty or doesn\'t contain meal plan information.',
        suggestions: [
          'Ensure the document contains meal plans, food lists, or nutrition guidelines',
          'Try uploading a different meal plan document'
        ]
      });
    }
    
    console.log(`📊 Processed ${chunks.length} chunks from meal plan`);
    
    // Store chunks in MongoDB
    let storageResult;
    try {
      storageResult = await storeChunks(chunks, planId);
    } catch (storageError) {
      // Clean up file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      return res.status(500).json({ 
        error: 'Failed to store meal plan',
        message: 'Unable to process and store the meal plan at this time.',
        details: storageError.message
      });
    }
    
    // Generate plan summary
    const summary = await generatePlanSummary(chunks);
    
    // Save plan metadata to MongoDB
    const planData = {
      planId: planId,
      filename: filename,
      documentType: parsedData.type,
      summary: summary.summary,
      sections: summary.sections,
      nutritionInfo: {
        meals: nutritionInfo.meals.length,
        foods: nutritionInfo.foods.length,
        restrictions: nutritionInfo.restrictions.length,
        timing: nutritionInfo.timing.length
      },
      chunksStored: chunks.length,
      isActive: true
    };
    
    try {
      // Deactivate all existing plans
      await NutritionPlan.updateMany({}, { isActive: false });
      
      // Save new plan
      const nutritionPlan = new NutritionPlan(planData);
      await nutritionPlan.save();
      
      console.log('✅ Meal plan metadata saved to MongoDB');
    } catch (dbError) {
      console.error('Error saving plan metadata:', dbError);
      // Continue anyway - chunks are already stored
    }
    
    // Clean up uploaded file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    res.json({
      success: true,
      message: 'Meal plan uploaded and processed successfully!',
      planId: planId,
      filename: filename,
      documentType: parsedData.type,
      chunksProcessed: chunks.length,
      chunksStored: storageResult.chunksStored,
      summary: summary.summary,
      sections: summary.sections,
      nutritionInfo: planData.nutritionInfo
    });
    
  } catch (error) {
    console.error('Error uploading meal plan:', error);
    
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to process meal plan. Please try again.',
      details: error.message 
    });
  }
};

/**
 * Ask question about meal plan
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const askQuestion = async (req, res) => {
  try {
    const { question, planId } = req.body;
    
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid question',
        message: 'Please provide a valid question about your meal plan.'
      });
    }
    
    // Get current plan if no planId provided
    let targetPlanId = planId;
    if (!targetPlanId) {
      const currentPlan = await getCurrentPlan();
      if (!currentPlan) {
        return res.status(404).json({ 
          error: 'No meal plan found',
          message: 'Please upload a meal plan first before asking questions.',
          suggestions: [
            'Upload a PDF, DOCX, or text file containing your meal plan',
            'Make sure the file contains meal plans, food lists, or nutrition guidelines'
          ]
        });
      }
      targetPlanId = currentPlan.planId;
    }
    
    console.log(`❓ Question: ${question}`);
    console.log(`📋 Plan ID: ${targetPlanId}`);
    
    // Search for relevant chunks - get more chunks for better context
    let relevantChunks;
    try {
      relevantChunks = await searchChunks(question, targetPlanId, 10);
    } catch (searchError) {
      console.error('Error searching chunks:', searchError);
      return res.status(500).json({ 
        error: 'Search failed',
        message: 'Unable to search the meal plan at this time.',
        details: searchError.message
      });
    }
    
    // Generate AI response
    let aiResponse;
    try {
      aiResponse = await generateRAGResponse(question, relevantChunks, targetPlanId);
    } catch (aiError) {
      console.error('Error generating AI response:', aiError);
      return res.status(500).json({ 
        error: 'AI response failed',
        message: 'Unable to generate a response at this time.',
        details: aiError.message
      });
    }
    
    // Update last accessed time
    try {
      await NutritionPlan.findOneAndUpdate(
        { planId: targetPlanId },
        { lastAccessed: new Date() }
      );
    } catch (updateError) {
      console.warn('Could not update last accessed time:', updateError.message);
    }
    
    res.json({
      success: true,
      question: question,
      answer: aiResponse.answer,
      citations: aiResponse.citations,
      confidence: aiResponse.confidence,
      planId: targetPlanId,
      chunksUsed: aiResponse.chunksUsed,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error answering question:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to process your question. Please try again.',
      details: error.message 
    });
  }
};

/**
 * Get current plan information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getCurrentPlanInfo = async (req, res) => {
  try {
    const plan = await getCurrentPlan();
    
    if (!plan) {
      return res.status(404).json({ 
        error: 'No plan found',
        message: 'No meal plan has been uploaded yet.'
      });
    }
    
    res.json({
      success: true,
      plan: {
        id: plan.planId,
        filename: plan.filename,
        type: plan.documentType,
        uploadedAt: plan.uploadedAt,
        lastAccessed: plan.lastAccessed,
        chunksStored: plan.chunksStored,
        summary: plan.summary,
        sections: plan.sections,
        nutritionInfo: plan.nutritionInfo
      }
    });
    
  } catch (error) {
    console.error('Error getting current plan:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to retrieve plan information.',
      details: error.message 
    });
  }
};

/**
 * Clear current plan
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const clearPlan = async (req, res) => {
  try {
    const currentPlan = await getCurrentPlan();
    
    if (!currentPlan) {
      return res.status(404).json({ 
        error: 'No plan found',
        message: 'No meal plan to clear.'
      });
    }
    
    // Clear chunks from MongoDB
    try {
      await clearPlanChunks(currentPlan.planId);
    } catch (clearError) {
      console.warn('Warning: Could not clear plan chunks:', clearError.message);
    }
    
    // Deactivate plan
    try {
      await NutritionPlan.findOneAndUpdate(
        { planId: currentPlan.planId },
        { isActive: false }
      );
    } catch (deactivateError) {
      console.warn('Warning: Could not deactivate plan:', deactivateError.message);
    }
    
    res.json({
      success: true,
      message: 'Meal plan cleared successfully.',
      clearedPlan: {
        id: currentPlan.planId,
        filename: currentPlan.filename,
        uploadedAt: currentPlan.uploadedAt
      }
    });
    
  } catch (error) {
    console.error('Error clearing plan:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to clear the meal plan.',
      details: error.message 
    });
  }
};

/**
 * Health check endpoint
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const healthCheck = async (req, res) => {
  try {
    const currentPlan = await getCurrentPlan();
    
    res.json({
      status: 'OK',
      message: 'Nutrition AI MVP Backend is running',
      timestamp: new Date().toISOString(),
      database: 'MongoDB',
      ai: 'Google Gemini AI - Human-Friendly Nutrition Specialist',
      currentPlan: currentPlan ? {
        id: currentPlan.planId,
        filename: currentPlan.filename,
        uploadedAt: currentPlan.uploadedAt
      } : null,
      version: '1.0.0'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR',
      message: 'Health check failed',
      error: error.message 
    });
  }
};

module.exports = {
  uploadPlan,
  askQuestion,
  getCurrentPlanInfo,
  clearPlan,
  healthCheck
}; 