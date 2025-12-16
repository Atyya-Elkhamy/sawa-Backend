#!/usr/bin/env node

/**
 * Test script for Special ID Store Purchase system
 * Run with: node test-special-id-store.js
 */

const mongoose = require('mongoose');
const config = require('./src/config/config');
const logger = require('./src/config/logger');

// Import services and models
const storeService = require('./src/services/store.service');
const Item = require('./src/models/item.model');
const UserSpecialId = require('./src/models/userSpecialId.model');
const User = require('./src/models/user.model');
const { ITEM_TYPES } = require('./src/config/stores.config');

async function testSpecialIdStorePurchase() {
  try {
    logger.info('🧪 Testing Special ID Store Purchase system...');

    // Connect to database
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    logger.info('✅ Connected to MongoDB');

    // 1. Create a test special ID item in the store
    logger.info('📦 Creating test special ID item...');
    
    const testSpecialIdItem = new Item({
      name: 'Test Premium Special ID',
      type: ITEM_TYPES.SPECIAL_ID,
      price: 100,
      image: 'https://example.com/special-id.png',
      file: 'TEST12345', // This will be the special ID value
      description: 'A premium test special ID',
      isTopProduct: true,
      isHidden: false,
      vipLevel: '0',
    });

    await testSpecialIdItem.save();
    logger.info(`✅ Created test special ID item: ${testSpecialIdItem.name} (ID: ${testSpecialIdItem._id})`);

    // 2. Test getting store sections (should include the special ID)
    logger.info('🏪 Testing store sections display...');
    const sections = await storeService.getStoreSections();
    const specialIdSection = sections.find(s => s.type === ITEM_TYPES.SPECIAL_ID);
    
    if (specialIdSection && specialIdSection.items.length > 0) {
      logger.info(`✅ Special ID section has ${specialIdSection.items.length} items`);
      logger.info(`   - Found test item: ${specialIdSection.items.find(i => i.name === testSpecialIdItem.name) ? 'Yes' : 'No'}`);
    } else {
      logger.warn('⚠️  No special ID items found in store sections');
    }

    // 3. Create test users for purchase simulation
    const testBuyerId = new mongoose.Types.ObjectId();
    const testRecipientId = new mongoose.Types.ObjectId();

    // Create test buyer with enough credits
    const testBuyer = new User({
      _id: testBuyerId,
      userId: 'testbuyer123',
      name: 'Test Buyer',
      email: 'testbuyer@test.com',
      credits: 1000,
    });
    await testBuyer.save();

    // Create test recipient
    const testRecipient = new User({
      _id: testRecipientId,
      userId: 'testrecipient123',
      name: 'Test Recipient',
      email: 'testrecipient@test.com',
      credits: 0,
    });
    await testRecipient.save();

    logger.info('👤 Created test users for purchase simulation');

    // 4. Test purchasing the special ID
    logger.info('💰 Testing special ID purchase...');
    
    try {
      const purchaseResult = await storeService.buyItem(
        testBuyerId,
        testRecipientId,
        testSpecialIdItem._id,
        7 // 7-day duration option
      );

      logger.info('✅ Special ID purchase successful!');
      logger.info(`   - Success: ${purchaseResult.success}`);
      logger.info(`   - Remaining credits: ${purchaseResult.remainingCredits}`);
      if (purchaseResult.specialId) {
        logger.info(`   - Special ID created: ${purchaseResult.specialId.value}`);
        logger.info(`   - Expires: ${purchaseResult.specialId.expirationDate}`);
      }
    } catch (error) {
      logger.error(`❌ Special ID purchase failed: ${error.message}`);
    }

    // 5. Verify the special ID was added to UserSpecialId model
    logger.info('🔍 Verifying special ID in UserSpecialId model...');
    const userSpecialIds = await UserSpecialId.find({ user: testRecipientId });
    if (userSpecialIds.length > 0) {
      logger.info(`✅ Found ${userSpecialIds.length} special ID(s) for recipient`);
      userSpecialIds.forEach(specialId => {
        logger.info(`   - ${specialId.name}: ${specialId.value} (expires: ${specialId.expirationDate})`);
      });
    } else {
      logger.warn('⚠️  No special IDs found for recipient');
    }

    // 6. Verify the item was removed from store
    logger.info('🔍 Verifying item removal from store...');
    const updatedItem = await Item.findById(testSpecialIdItem._id);
    if (updatedItem && updatedItem.usedUntil) {
      logger.info('✅ Item marked as used (removed from store)');
      logger.info(`   - Used until: ${updatedItem.usedUntil}`);
    } else {
      logger.warn('⚠️  Item not marked as used');
    }

    // 7. Test store sections again (should not include the purchased special ID)
    logger.info('🏪 Testing store sections after purchase...');
    const sectionsAfter = await storeService.getStoreSections();
    const specialIdSectionAfter = sectionsAfter.find(s => s.type === ITEM_TYPES.SPECIAL_ID);
    
    if (specialIdSectionAfter) {
      const testItemStillVisible = specialIdSectionAfter.items.find(i => i._id.toString() === testSpecialIdItem._id.toString());
      if (testItemStillVisible) {
        logger.warn('⚠️  Test item still visible in store (should be hidden)');
      } else {
        logger.info('✅ Test item correctly hidden from store after purchase');
      }
    }

    // 8. Test attempting to purchase the same special ID again (should fail)
    logger.info('🚫 Testing duplicate purchase prevention...');
    try {
      await storeService.buyItem(
        testBuyerId,
        testRecipientId,
        testSpecialIdItem._id,
        7
      );
      logger.warn('⚠️  Duplicate purchase was allowed (should have been prevented)');
    } catch (error) {
      logger.info('✅ Duplicate purchase correctly prevented');
      logger.info(`   - Error: ${error.message}`);
    }

    // 9. Clean up test data
    logger.info('🧹 Cleaning up test data...');
    await Item.findByIdAndDelete(testSpecialIdItem._id);
    await User.findByIdAndDelete(testBuyerId);
    await User.findByIdAndDelete(testRecipientId);
    await UserSpecialId.deleteMany({ user: testRecipientId });
    logger.info('✅ Test data cleaned up');

    logger.info('🎉 Special ID Store Purchase system test completed!');

  } catch (error) {
    logger.error('❌ Test failed:', error);
  } finally {
    logger.info('🔌 Disconnecting from MongoDB');
    await mongoose.disconnect();
  }
}

testSpecialIdStorePurchase().catch(console.error);
