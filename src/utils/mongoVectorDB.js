const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Chunk = require('../models/Chunk');
const NutritionPlan = require('../models/NutritionPlan');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate embedding for text using Gemini
 * @param {string} text - Text to embed
 * @returns {Promise<Array<number>>} - Embedding vector
 */
const generateEmbedding = async (text) => {
  try {
    // Note: Gemini doesn't have a direct embedding API like OpenAI
    // We'll use a text embedding model or create a simple hash-based embedding
    // For now, we'll create a simple embedding using text characteristics
    
    const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });
    const result = await embeddingModel.embedContent(text);
    const embedding = await result.embedding;
    
    return embedding.values;
  } catch (error) {
    console.error('Error generating embedding:', error);
    
    // Fallback: create a simple embedding based on text characteristics
    console.log('Using fallback embedding method...');
    return createFallbackEmbedding(text);
  }
};

/**
 * Create a fallback embedding when Gemini embedding fails
 * @param {string} text - Text to embed
 * @returns {Array<number>} - Simple embedding vector
 */
const createFallbackEmbedding = (text) => {
  // Create a simple 1536-dimensional embedding based on text characteristics
  const embedding = new Array(1536).fill(0);
  
  // Simple hash-based approach
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const position = (charCode * i) % 1536;
    embedding[position] = (embedding[position] + charCode) / 255;
  }
  
  // Normalize the embedding
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] = embedding[i] / magnitude;
    }
  }
  
  return embedding;
};

/**
 * Store chunks with embeddings in MongoDB
 * @param {Array} chunks - Array of chunks with text and metadata
 * @param {string} planId - Plan identifier
 * @returns {Promise<Object>} - Storage result
 */
const storeChunks = async (chunks, planId) => {
  try {
    console.log(`📦 Storing ${chunks.length} chunks for plan ${planId}...`);
    
    // Process chunks in batches to prevent memory issues
    const batchSize = 10;
    const storedChunks = [];
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`);
      
      // Generate embeddings for batch
      const batchWithEmbeddings = await Promise.all(
        batch.map(async (chunk, batchIndex) => {
          try {
            const embedding = await generateEmbedding(chunk.text);
            return {
              chunkId: `${planId}_chunk_${i + batchIndex}`,
              planId: planId,
              text: chunk.text,
              embedding: embedding,
              metadata: chunk.metadata
            };
          } catch (error) {
            console.error(`Error processing chunk ${i + batchIndex}:`, error);
            return null;
          }
        })
      );
      
      // Filter out failed chunks and store in MongoDB
      const validChunks = batchWithEmbeddings.filter(chunk => chunk !== null);
      
      if (validChunks.length > 0) {
        try {
          await Chunk.insertMany(validChunks, { ordered: false });
          storedChunks.push(...validChunks);
        } catch (dbError) {
          console.error('Error storing batch in MongoDB:', dbError);
          // Continue with next batch
        }
      }
      
      // Small delay to prevent overwhelming the API
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`✅ Successfully stored ${storedChunks.length} chunks`);
    
    return {
      chunksStored: storedChunks.length,
      planId: planId
    };
    
  } catch (error) {
    console.error('Error storing chunks:', error);
    throw new Error(`Failed to store chunks: ${error.message}`);
  }
};

/**
 * Search for relevant chunks using vector similarity
 * @param {string} query - Search query
 * @param {string} planId - Plan identifier
 * @param {number} limit - Number of results to return
 * @returns {Promise<Array>} - Relevant chunks
 */
const searchChunks = async (query, planId, limit = 8) => {
  try {
    console.log(`🔍 Searching for chunks related to: "${query}"`);
    
    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query);
    
    // Try MongoDB Atlas vector search first
    if (process.env.MONGO_URI && process.env.MONGO_URI.includes('mongodb+srv')) {
      try {
        const db = mongoose.connection.db;
        const results = await db.collection('nutrition_plan_chunks').aggregate([
          {
            $vectorSearch: {
              queryVector: queryEmbedding,
              path: "embedding",
              numCandidates: 100,
              limit: limit,
              index: "vector_search_index"
            }
          },
          {
            $match: {
              planId: planId
            }
          },
          {
            $project: {
              text: 1,
              metadata: 1,
              score: { $meta: "vectorSearchScore" }
            }
          }
        ]).toArray();
        
        if (results.length > 0) {
          console.log(`✅ Found ${results.length} chunks using MongoDB Atlas vector search`);
          return results;
        }
      } catch (vectorError) {
        console.warn('Vector search failed, falling back to cosine similarity:', vectorError.message);
      }
    }
    
    // Fallback to cosine similarity for local MongoDB
    console.log('🔄 Using cosine similarity fallback...');
    
    // Get more chunks for better context
    const chunks = await Chunk.find({ planId: planId }).limit(200);
    
    if (chunks.length === 0) {
      return [];
    }
    
    // Calculate cosine similarity for each chunk
    const chunksWithSimilarity = chunks.map(chunk => ({
      text: chunk.text,
      metadata: chunk.metadata,
      score: cosineSimilarity(queryEmbedding, chunk.embedding)
    }));
    
    // Sort by similarity and return top results
    const sortedChunks = chunksWithSimilarity
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    console.log(`✅ Found ${sortedChunks.length} chunks using cosine similarity`);
    return sortedChunks;
    
  } catch (error) {
    console.error('Error searching chunks:', error);
    throw new Error(`Failed to search chunks: ${error.message}`);
  }
};

/**
 * Calculate cosine similarity between two vectors
 * @param {Array<number>} vectorA - First vector
 * @param {Array<number>} vectorB - Second vector
 * @returns {number} - Cosine similarity score
 */
const cosineSimilarity = (vectorA, vectorB) => {
  if (!vectorA || !vectorB || vectorA.length !== vectorB.length) {
    return 0;
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    normA += vectorA[i] * vectorA[i];
    normB += vectorB[i] * vectorB[i];
  }
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Clear chunks for a specific plan
 * @param {string} planId - Plan identifier
 * @returns {Promise<Object>} - Clear result
 */
const clearPlanChunks = async (planId) => {
  try {
    const result = await Chunk.deleteMany({ planId: planId });
    console.log(`🗑️  Cleared ${result.deletedCount} chunks for plan ${planId}`);
    return { deletedCount: result.deletedCount };
  } catch (error) {
    console.error('Error clearing plan chunks:', error);
    throw new Error(`Failed to clear plan chunks: ${error.message}`);
  }
};

/**
 * Get current active plan
 * @returns {Promise<Object|null>} - Active plan or null
 */
const getCurrentPlan = async () => {
  try {
    const plan = await NutritionPlan.findOne({ isActive: true })
      .sort({ uploadedAt: -1 }); // Get the most recently uploaded active plan
    
    return plan;
  } catch (error) {
    console.error('Error getting current plan:', error);
    throw error;
  }
};

/**
 * Set plan as active and deactivate others
 * @param {string} planId - Plan identifier
 * @returns {Promise<Object>} - Update result
 */
const setActivePlan = async (planId) => {
  try {
    // Deactivate all plans
    await NutritionPlan.updateMany(
      { isActive: true },
      { isActive: false }
    );
    
    // Activate the specified plan
    const result = await NutritionPlan.findOneAndUpdate(
      { planId: planId },
      { 
        isActive: true,
        lastAccessed: new Date()
      },
      { new: true }
    );
    
    return result;
  } catch (error) {
    console.error('Error setting active plan:', error);
    throw error;
  }
};

module.exports = {
  generateEmbedding,
  storeChunks,
  searchChunks,
  cosineSimilarity,
  clearPlanChunks,
  getCurrentPlan,
  setActivePlan
}; 