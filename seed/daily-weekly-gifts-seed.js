/**
 * Seed script to create daily and weekly gifts in the database
 * Run with: node seed/daily-weekly-gifts-seed.js
 */

const mongoose = require('mongoose');
const config = require('../src/config/config');
const Gift = require('../src/models/gift.model');
const GiftCategory = require('../src/models/giftCategory.model');
const logger = require('../src/config/logger');

// Default gift names
const DEFAULT_WEEKLY_GIFT_NAME = 'المارد';
const DEFAULT_DAILY_GIFT_NAME = 'daily-gift';

// Free gifts category name
const FREE_GIFTS_CATEGORY = {
  name: 'Free Gifts',
  nameAr: 'الهدايا المجانية'
};

// Daily and weekly gifts data
const DAILY_WEEKLY_GIFTS = [
  // {
  //   name: DEFAULT_DAILY_GIFT_NAME,
  //   price: 0, // Free gift
  //   description: 'Daily reward gift for users',
  //   image: 'https://app.rootmatrix.cloud	/public/assets/daily-gift.png',
  //   file: 'https://app.rootmatrix.cloud	/public/assets/daily-gift.svga',
  //   type: 'free',
  //   gameMultiplier: 1,
  //   hidden: true,
  // },
  {
    name: DEFAULT_WEEKLY_GIFT_NAME,
    price: 0, // Free gift
    description: 'Weekly reward gift for users',
    image: 'https://app.rootmatrix.cloud	/public/assets/weekly-gift.png',
    file: 'https://app.rootmatrix.cloud	/public/assets/weekly-gift.svga',
    type: 'free',
    gameMultiplier: 1,
    hidden: true,
  },
];

/**
 * Ensure free gifts category exists
 */
async function ensureFreeGiftsCategory() {
  logger.info('Checking for free gifts category...');

  let freeGiftsCategory = await GiftCategory.findOne({ name: FREE_GIFTS_CATEGORY.name });

  if (!freeGiftsCategory) {
    logger.info('Free gifts category not found, creating...');
    freeGiftsCategory = await GiftCategory.create(FREE_GIFTS_CATEGORY);
    logger.info(`Created free gifts category: ${freeGiftsCategory?.name}`);
  } else {
    logger.info('Free gifts category already exists');
  }

  return freeGiftsCategory;
}

/**
 * Seed daily and weekly gifts
 */
async function seedDailyWeeklyGifts() {
  logger.info('Seeding daily and weekly gifts...');

  // First ensure the free gifts category exists
  const freeGiftsCategory = await ensureFreeGiftsCategory();

  for (const giftData of DAILY_WEEKLY_GIFTS) {
    // Add the category ID to the gift data
    const giftWithCategory = {
      ...giftData,
      category: freeGiftsCategory._id
    };

    // Check if gift exists
    const existingGift = await Gift.findOne({ name: giftData.name });

    if (existingGift) {
      logger.info(`Gift ${giftData.name} already exists, updating...`);
      // Update existing gift with new data
      await Gift.updateOne({ name: giftData.name }, giftWithCategory);
      logger.info(`Updated ${giftData.name}`);
    } else {
      // Create new gift
      await Gift.create(giftWithCategory);
      logger.info(`Created new gift: ${giftData.name}`);
    }
  }

  logger.info('Daily and weekly gifts seeding completed successfully');
}

// Run seeder if this file is executed directly
if (require.main === module) {
  // Connect to database
  mongoose.connect(config.mongoose.url, config.mongoose.options).then(() => {
    logger.info('Connected to MongoDB');
    seedDailyWeeklyGifts()
      .then(() => {
        logger.info('Daily and weekly gifts seeding completed');
        mongoose.disconnect();
      })
      .catch((error) => {
        logger.error('Daily and weekly gifts seeding failed', error);
        mongoose.disconnect();
      });
  });
}

module.exports = {
  seedDailyWeeklyGifts,
  ensureFreeGiftsCategory,
};
