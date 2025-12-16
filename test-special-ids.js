#!/usr/bin/env node

/**
 * Test script for Special ID system
 * Run with: node test-special-ids.js
 */

const mongoose = require('mongoose');
const config = require('./src/config/config');
const logger = require('./src/config/logger');

// Import services and models
const UserSpecialId = require('./src/models/userSpecialId.model');

async function testSpecialIdSystem() {
  try {
    logger.info('🧪 Testing Special ID system...');

    // Connect to database
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    logger.info('✅ Connected to MongoDB');

    // 1. Test generating special IDs for different VIP levels
    logger.info('� Testing VIP special ID generation...');
    
    for (let vipLevel = 1; vipLevel <= 7; vipLevel++) {
      try {
        const specialIdValue = await UserSpecialId.generateUniqueSpecialId(vipLevel);
        logger.info(`VIP Level ${vipLevel}: Generated special ID: ${specialIdValue}`);
      } catch (error) {
        logger.error(`❌ Error generating special ID for VIP level ${vipLevel}:`, error.message);
      }
    }

    // 2. Test creating a VIP user special ID (simulating VIP subscription)
    logger.info('➕ Testing VIP special ID creation for user...');
    
    // Create a test user ID (you can replace this with an actual user ID from your database)
    const testUserId = new mongoose.Types.ObjectId();
    
    for (let vipLevel = 1; vipLevel <= 3; vipLevel++) {
      try {
        const userSpecialId = await UserSpecialId.generateForVipUser(testUserId, vipLevel, 30);
        logger.info(`✅ Created VIP ${vipLevel} special ID: ${userSpecialId.name} (${userSpecialId.value})`);
      } catch (error) {
        logger.error(`❌ Error creating VIP special ID for level ${vipLevel}:`, error.message);
      }
    }

    // 3. Test getting user's special IDs
    logger.info('📋 Testing user special ID retrieval...');
    try {
      const userSpecialIds = await UserSpecialId.getAllForUser(testUserId);
      logger.info(`User has ${userSpecialIds.length} special IDs:`);
      userSpecialIds.forEach(sid => {
        logger.info(`  - ${sid.name} (${sid.value}) - VIP Level: ${sid.vipLevel} - Active: ${sid.isActive} - Expires: ${sid.expirationDate}`);
      });
    } catch (error) {
      logger.error('❌ Error retrieving user special IDs:', error.message);
    }

    // 4. Test activating a special ID
    if (await UserSpecialId.countDocuments({ user: testUserId }) > 0) {
      logger.info('🔄 Testing special ID activation...');
      try {
        const firstSpecialId = await UserSpecialId.findOne({ user: testUserId });
        const activated = await UserSpecialId.activateForUser(testUserId, firstSpecialId._id);
        logger.info(`✅ Activated special ID: ${activated.value}`);
      } catch (error) {
        logger.error('❌ Error activating special ID:', error.message);
      }
    }

    // 5. Test extending special ID (simulating VIP resubscription)
    logger.info('⏰ Testing special ID extension (resubscription)...');
    try {
      const extendedSpecialId = await UserSpecialId.generateForVipUser(testUserId, 1, 30); // Same VIP level
      logger.info(`✅ Extended special ID: ${extendedSpecialId.value} - New expiration: ${extendedSpecialId.expirationDate}`);
    } catch (error) {
      logger.error('❌ Error extending special ID:', error.message);
    }

    // 6. Clean up test data
    logger.info('🧹 Cleaning up test data...');
    await UserSpecialId.deleteMany({ user: testUserId });
    logger.info('✅ Test data cleaned up');

    logger.info('🎉 Special ID system test completed!');
    
  } catch (error) {
    logger.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    logger.info('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the test
testSpecialIdSystem();
