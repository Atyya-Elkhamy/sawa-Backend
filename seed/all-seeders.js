/**
 * Master seed script to run all seeders
 * Run with: node seed/all-seeders.js
 */

const mongoose = require('mongoose');
const config = require('../src/config/config');
const logger = require('../src/config/logger');

// Import seeder functions
const { seedDailyWeeklyGifts } = require('./daily-weekly-gifts-seed');
const { seedLevelRewardItems } = require('./level-reward-items-seed');
const { seedVipStickers } = require('./vip-stickers-seed');

/**
 * Run all seeders sequentially
 */
async function runAllSeeders() {
  try {
    logger.info('🌱 Starting all seeders...');

    // Connect to database
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    logger.info('✅ Connected to MongoDB');

    // Run all seeders sequentially
    logger.info('📦 Running daily and weekly gifts seeder...');
    await seedDailyWeeklyGifts();
    logger.info('✅ Daily and weekly gifts seeded successfully');

    logger.info('🏆 Running level reward items seeder...');
    await seedLevelRewardItems();
    logger.info('✅ Level reward items seeded successfully');

    logger.info('⭐ Running VIP stickers seeder...');
    await seedVipStickers();
    logger.info('✅ VIP stickers seeded successfully');

    logger.info('🎉 All seeders completed successfully!');
    
  } catch (error) {
    logger.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    // Disconnect from database
    await mongoose.disconnect();
    logger.info('🔌 Disconnected from MongoDB');
  }
}

// Run the master seeder if this file is executed directly
if (require.main === module) {
  runAllSeeders()
    .then(() => {
      logger.info('🚀 All seeding operations completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Seeding process failed:', error);
      process.exit(1);
    });
}

module.exports = {
  runAllSeeders,
};
