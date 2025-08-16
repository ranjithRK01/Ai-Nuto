const mongoose = require('mongoose');
require('dotenv').config();

async function fixDatabase() {
  try {
    console.log('🔧 Fixing database schema...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get the database instance
    const db = mongoose.connection.db;
    
    // Check if bills collection exists
    const collections = await db.listCollections().toArray();
    const billsCollectionExists = collections.some(col => col.name === 'bills');
    
    if (billsCollectionExists) {
      console.log('🗑️  Dropping existing bills collection...');
      await db.dropCollection('bills');
      console.log('✅ Bills collection dropped');
    }
    
    // Check if menu_items collection exists
    const menuItemsCollectionExists = collections.some(col => col.name === 'menu_items');
    
    if (menuItemsCollectionExists) {
      console.log('🗑️  Dropping existing menu_items collection...');
      await db.dropCollection('menu_items');
      console.log('✅ Menu items collection dropped');
    }
    
    console.log('✨ Database schema fixed!');
    console.log('💡 You can now restart your server and the collections will be recreated with the correct schema.');
    
  } catch (error) {
    console.error('❌ Error fixing database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the fix
fixDatabase();
