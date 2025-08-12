/**
 * Calculate cosine similarity between two vectors
 * @param {number[]} vectorA - First vector
 * @param {number[]} vectorB - Second vector
 * @returns {number} - Cosine similarity score (0 to 1)
 */
const cosineSimilarity = (vectorA, vectorB) => {
  if (vectorA.length !== vectorB.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    normA += vectorA[i] * vectorA[i];
    normB += vectorB[i] * vectorB[i];
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (normA * normB);
};

/**
 * Find top N most similar chunks to a query embedding
 * @param {number[]} queryEmbedding - Query embedding vector
 * @param {Array} chunks - Array of chunk objects with embedding property
 * @param {number} topN - Number of top results to return
 * @returns {Array} - Array of top N chunks with similarity scores
 */
const findTopSimilarChunks = (queryEmbedding, chunks, topN = 3) => {
  const similarities = chunks.map(chunk => ({
    chunk,
    similarity: cosineSimilarity(queryEmbedding, chunk.embedding)
  }));
  
  // Sort by similarity score (descending)
  similarities.sort((a, b) => b.similarity - a.similarity);
  
  // Return top N results
  return similarities.slice(0, topN);
};

module.exports = {
  cosineSimilarity,
  findTopSimilarChunks
}; 