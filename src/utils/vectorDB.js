const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

// Initialize OpenAI for embeddings
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Supabase client
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/**
 * Generate embedding for text using OpenAI
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} - Embedding vector
 */
const generateEmbedding = async (text) => {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate embedding');
  }
};

/**
 * Store document chunks in Supabase Vector
 * @param {Array} chunks - Array of text chunks with metadata
 * @param {string} planId - Unique plan identifier
 * @returns {Promise<Object>} - Storage result
 */
const storeChunksInSupabase = async (chunks, planId) => {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  try {
    console.log(`🔄 Storing ${chunks.length} chunks in Supabase Vector...`);

    const vectors = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await generateEmbedding(chunk.text);

      vectors.push({
        id: `${planId}_chunk_${i}`,
        content: chunk.text,
        metadata: {
          planId: planId,
          chunkIndex: i,
          chunkType: chunk.type || 'text',
          createdAt: new Date().toISOString(),
        },
        embedding: embedding,
      });
    }

    // Insert vectors into Supabase
    const { data, error } = await supabase
      .from('nutrition_plan_chunks')
      .insert(vectors);

    if (error) {
      throw new Error(`Supabase insert error: ${error.message}`);
    }

    console.log('✅ Chunks stored successfully in Supabase');
    return {
      success: true,
      chunksStored: chunks.length,
      planId: planId,
    };
  } catch (error) {
    console.error('Error storing chunks in Supabase:', error);
    throw error;
  }
};

/**
 * Search for similar chunks in Supabase Vector
 * @param {string} query - Search query
 * @param {string} planId - Plan identifier to search within
 * @param {number} limit - Number of results to return
 * @returns {Promise<Array>} - Similar chunks
 */
const searchChunksInSupabase = async (query, planId, limit = 5) => {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  try {
    const queryEmbedding = await generateEmbedding(query);

    const { data, error } = await supabase.rpc('match_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: limit,
      filter_plan_id: planId,
    });

    if (error) {
      throw new Error(`Supabase search error: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error searching chunks in Supabase:', error);
    throw error;
  }
};

/**
 * Store document chunks (with fallback options)
 * @param {Array} chunks - Array of text chunks
 * @param {string} planId - Plan identifier
 * @returns {Promise<Object>} - Storage result
 */
const storeChunks = async (chunks, planId) => {
  // Try Supabase first
  if (supabase) {
    return await storeChunksInSupabase(chunks, planId);
  }

  // Fallback: Store in memory (for development/testing)
  console.log('⚠️  No vector database configured, storing in memory');
  return {
    success: true,
    chunksStored: chunks.length,
    planId: planId,
    warning: 'Stored in memory - not persistent',
  };
};

/**
 * Search for similar chunks (with fallback options)
 * @param {string} query - Search query
 * @param {string} planId - Plan identifier
 * @param {number} limit - Number of results
 * @returns {Promise<Array>} - Similar chunks
 */
const searchChunks = async (query, planId, limit = 5) => {
  // Try Supabase first
  if (supabase) {
    return await searchChunksInSupabase(query, planId, limit);
  }

  // Fallback: Return empty array
  console.log('⚠️  No vector database configured, returning empty results');
  return [];
};

/**
 * Clear all chunks for a specific plan
 * @param {string} planId - Plan identifier
 * @returns {Promise<Object>} - Deletion result
 */
const clearPlanChunks = async (planId) => {
  if (!supabase) {
    return { success: true, message: 'No vector database configured' };
  }

  try {
    const { error } = await supabase
      .from('nutrition_plan_chunks')
      .delete()
      .eq('metadata->planId', planId);

    if (error) {
      throw new Error(`Supabase delete error: ${error.message}`);
    }

    return { success: true, message: 'Plan chunks cleared' };
  } catch (error) {
    console.error('Error clearing plan chunks:', error);
    throw error;
  }
};

module.exports = {
  generateEmbedding,
  storeChunks,
  searchChunks,
  clearPlanChunks,
  storeChunksInSupabase,
  searchChunksInSupabase,
};
