#!/usr/bin/env node

/**
 * Test script for My Bought Items with Special IDs
 * Run with: node test-my-bought-items.js
 */

const mongoose = require('mongoose');
const config = require('./src/config/config');
const logger = require('./src/config/logger');

// Import services and models
const storeService = require('./src/services/store.service');
const UserSpecialId = require('./src/models/userSpecialId.model');
const BoughtItem = require('./src/models/boughtItem.model');
const Item = require('./src/models/item.model');
const User = require('./src/models/user.model');
const { ITEM_TYPES } = require('./src/config/stores.config');

async function testMyBoughtItemsWithSpecialIds() {
  try {
    logger.info('🧪 Testing My Bought Items with Special IDs...');

    // Connect to database
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    logger.info('✅ Connected to MongoDB');

    // 1. Create a test user
    const testUserId = new mongoose.Types.ObjectId();
    const testUser = new User({
      _id: testUserId,
      userId: 'testuser456',
      name: 'Test User',
      email: 'testuser@test.com',
      credits: 1000,
    });
    await testUser.save();
    logger.info('👤 Created test user');

    // 2. Create a test regular item (frame)
    const testFrame = new Item({
      name: 'Test Frame',
      type: ITEM_TYPES.FRAME,
      price: 50,
      image: 'https://example.com/frame.png',
      file: 'frame_file.png',
      isTopProduct: true,
      vipLevel: '0',
    });
    await testFrame.save();

    // 3. Add the frame to user's bought items
    const boughtItem = new BoughtItem({
      user: testUserId,
      item: testFrame._id,
      expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      isSelected: false,
    });
    await boughtItem.save();
    logger.info('🛍️ Added test frame to bought items');

    // 4. Create test special IDs for the user
    const specialId1 = new UserSpecialId({
      user: testUserId,
      name: 'Premium Special ID',
      value: 'PREMIUM123',
      expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      vipLevel: 3,
      source: 'store_purchase',
      isActive: true,
    });
    await specialId1.save();

    const specialId2 = new UserSpecialId({
      user: testUserId,
      name: 'VIP Special ID',
      value: 'VIP456',
      expirationDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
      vipLevel: 5,
      source: 'vip_subscription',
      isActive: false,
    });
    await specialId2.save();
    logger.info('🆔 Created test special IDs');

    // 5. Test getting user's bought items (should include both regular items and special IDs)
    logger.info('📋 Testing getMyBoughtItems...');
    const result = await storeService.getMyBoughtItems(testUserId);

    logger.info(`✅ Retrieved bought items with ${result.itemsBySections.length} sections`);

    // 6. Check if special ID section exists and has items
    const specialIdSection = result.itemsBySections.find(s => s.sectionType === ITEM_TYPES.SPECIAL_ID);
    if (specialIdSection) {
      logger.info(`🆔 Special ID section found with ${specialIdSection.items.length} items:`);
      specialIdSection.items.forEach((item, index) => {
        logger.info(`   ${index + 1}. ${item.name} (${item.file}) - Selected: ${item.isSelected} - Expires: ${item.expirationDate}`);
      });
    } else {
      logger.warn('⚠️  No special ID section found');
    }

    // 7. Check if frame section exists and has items
    const frameSection = result.itemsBySections.find(s => s.sectionType === ITEM_TYPES.FRAME);
    if (frameSection) {
      logger.info(`🖼️ Frame section found with ${frameSection.items.length} items:`);
      frameSection.items.forEach((item, index) => {
        logger.info(`   ${index + 1}. ${item.name} - Selected: ${item.isSelected} - Expires: ${item.expirationDate}`);
      });
    } else {
      logger.warn('⚠️  No frame section found');
    }

    // 8. Test selecting a special ID
    logger.info('🎯 Testing special ID selection...');
    try {
      const selectResult = await storeService.selectItem(testUserId, specialId2._id);
      logger.info(`✅ Special ID selection result: ${selectResult.action || 'completed'}`);
      
      // Verify the user's special ID was updated
      const updatedUser = await User.findById(testUserId).select('specialId');
      logger.info(`   User's active special ID: ${updatedUser.specialId?.url || 'none'}`);
    } catch (error) {
      logger.error(`❌ Special ID selection failed: ${error.message}`);
    }

    // 9. Test selecting a regular item
    logger.info('🎯 Testing regular item selection...');
    try {
      await storeService.selectItem(testUserId, boughtItem._id);
      logger.info('✅ Regular item selection completed');
    } catch (error) {
      logger.error(`❌ Regular item selection failed: ${error.message}`);
    }

    // 10. Test getting bought items again to see updated selections
    logger.info('📋 Testing updated bought items...');
    const updatedResult = await storeService.getMyBoughtItems(testUserId);
    
    const updatedSpecialIdSection = updatedResult.itemsBySections.find(s => s.sectionType === ITEM_TYPES.SPECIAL_ID);
    if (updatedSpecialIdSection) {
      logger.info('🆔 Updated special ID selections:');
      updatedSpecialIdSection.items.forEach((item, index) => {
        logger.info(`   ${index + 1}. ${item.name} - Selected: ${item.isSelected}`);
      });
    }

    // 11. Clean up test data
    logger.info('🧹 Cleaning up test data...');
    await User.findByIdAndDelete(testUserId);
    await Item.findByIdAndDelete(testFrame._id);
    await BoughtItem.findByIdAndDelete(boughtItem._id);
    await UserSpecialId.deleteMany({ user: testUserId });
    logger.info('✅ Test data cleaned up');

    logger.info('🎉 My Bought Items with Special IDs test completed!');

  } catch (error) {
    logger.error('❌ Test failed:', error);
  } finally {
    logger.info('🔌 Disconnecting from MongoDB');
    await mongoose.disconnect();
  }
}

testMyBoughtItemsWithSpecialIds().catch(console.error);
