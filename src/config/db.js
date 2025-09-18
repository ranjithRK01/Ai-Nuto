const mongoose = require('mongoose');

const connectDB = async () => {
  try {
const mongoUri = process.env.MONGO_URI || "mongodb+srv://ranjithRk01:IH7Z2BW2rBJTTTYu@reqsta.ntqrp.mongodb.net/reqsta?retryWrites=true&w=majority&appName=nutrition-ai"
    const conn = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);

   // Create vector search index if it doesn't exist (only for Atlas)
    if (true) {
      await createVectorSearchIndex();
    } else {
      console.log('💡 Local MongoDB detected - vector search will use cosine similarity fallback');
    }

    // Return the connection for external use
    return conn;
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    console.log(
      '💡 Make sure MongoDB is running and MONGO_URI is set in .env file'
    );
    process.exit(1);
  }
};

/**
 * Create vector search index for nutrition plan chunks (MongoDB Atlas only)
 */
const createVectorSearchIndex = async () => {
  try {
    const db = mongoose.connection.db;

    // Check if index already exists
    const indexes = await db.collection('nutrition_plan_chunks').indexes();
    const vectorIndexExists = indexes.some(
      (index) => index.name === 'vector_search_index'
    );

    if (!vectorIndexExists) {
      console.log('🔧 Creating vector search index...');

      await db.collection('nutrition_plan_chunks').createIndex(
        { embedding: 'vector' },
        {
          name: 'vector_search_index',
          vectorSize: 1536,
          vectorSearchOptions: {
            numCandidates: 100,
            indexType: 'hnsw',
          },
        }
      );

      console.log('✅ Vector search index created successfully');
    } else {
      console.log('✅ Vector search index already exists');
    }
  } catch (error) {
    console.warn('⚠️  Could not create vector search index:', error.message);
    console.log(
      '💡 This is normal for local MongoDB. Vector search will work with MongoDB Atlas.'
    );
  }
};

module.exports = connectDB;
