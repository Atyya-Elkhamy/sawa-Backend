#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const ATLAS_CONNECTION = 'mongodb+srv://essamdrc1:6101975ES@eslamstest.kwmp5br.mongodb.net/prod_Sawa?retryWrites=true&w=majority&appName=ESLAMTEST';
const LOCAL_CONNECTION = 'mongodb://localhost:27017/prod_Sawa';
const BACKUP_DIR = './database-backup';

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

console.log('🚀 Starting database migration from Atlas to Local MongoDB...\n');

// Step 1: Dump data from Atlas
console.log('📦 Step 1: Dumping data from MongoDB Atlas...');
const dumpCommand = `mongodump --uri="${ATLAS_CONNECTION}" --out="${BACKUP_DIR}"`;

exec(dumpCommand, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Error dumping from Atlas:', error.message);
    return;
  }
  if (stderr) {
    console.error('⚠️  Warning:', stderr);
  }
  
  console.log('✅ Successfully dumped data from Atlas');
  console.log(stdout);
  
  // Step 2: Restore to local MongoDB
  console.log('\n📥 Step 2: Restoring data to local MongoDB...');
  const restoreCommand = `mongorestore --uri="${LOCAL_CONNECTION}" --drop "${BACKUP_DIR}/prod_Sawa"`;
  
  exec(restoreCommand, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Error restoring to local:', error.message);
      return;
    }
    if (stderr) {
      console.error('⚠️  Warning:', stderr);
    }
    
    console.log('✅ Successfully restored data to local MongoDB');
    console.log(stdout);
    
    // Step 3: Verify migration
    console.log('\n🔍 Step 3: Verifying migration...');
    verifyMigration();
  });
});

function verifyMigration() {
  const { MongoClient } = require('mongodb');
  
  async function checkCollections() {
    const client = new MongoClient(LOCAL_CONNECTION);
    
    try {
      await client.connect();
      const db = client.db('prod_Sawa');
      const collections = await db.listCollections().toArray();
      
      console.log(`📊 Found ${collections.length} collections in local database:`);
      for (const collection of collections) {
        const count = await db.collection(collection.name).countDocuments();
        console.log(`   - ${collection.name}: ${count} documents`);
      }
      
      console.log('\n🎉 Migration completed successfully!');
      console.log('💡 Don\'t forget to update your .env file to use the local connection string.');
      
    } catch (error) {
      console.error('❌ Error verifying migration:', error.message);
    } finally {
      await client.close();
    }
  }
  
  checkCollections();
}
