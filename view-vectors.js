const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Chunk = require('./src/models/Chunk');

async function viewVectorDatabase() {
  try {
    console.log('🔍 Viewing Vector Database Contents...\n');
    
    // Get total count
    const totalChunks = await Chunk.countDocuments();
    console.log(`📊 Total chunks in database: ${totalChunks}\n`);
    
    if (totalChunks === 0) {
      console.log('❌ No data found. Please upload a PDF first using POST /api/upload');
      return;
    }
    
    // Get all chunks with embeddings
    const chunks = await Chunk.find({});
    
    console.log('📋 Chunk Details:');
    console.log('================\n');
    
    chunks.forEach((chunk, index) => {
      console.log(`Chunk ${index + 1}:`);
      console.log(`  ID: ${chunk.chunkId}`);
      console.log(`  Text: ${chunk.text.substring(0, 100)}${chunk.text.length > 100 ? '...' : ''}`);
      console.log(`  Embedding Length: ${chunk.embedding.length} dimensions`);
      console.log(`  Created: ${chunk.createdAt}`);
      console.log(`  Embedding Sample: [${chunk.embedding.slice(0, 5).join(', ')}...]`);
      console.log('');
    });
    
    // Show embedding statistics
    if (chunks.length > 0) {
      const embeddingLength = chunks[0].embedding.length;
      console.log('📈 Vector Database Statistics:');
      console.log('==============================');
      console.log(`  Total Vectors: ${totalChunks}`);
      console.log(`  Vector Dimensions: ${embeddingLength}`);
      console.log(`  Database Size: ~${(totalChunks * embeddingLength * 8 / 1024).toFixed(2)} KB`);
      console.log(`  Average Text Length: ${Math.round(chunks.reduce((sum, chunk) => sum + chunk.text.length, 0) / chunks.length)} characters`);
    }
    
  } catch (error) {
    console.error('❌ Error viewing vector database:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

// Run the script
viewVectorDatabase(); 