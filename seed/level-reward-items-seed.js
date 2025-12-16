/**
 * Seed script to create level reward items in the database
 * Run with: node seed/level-reward-items-seed.js
 */

const mongoose = require('mongoose');
const config = require('../src/config/config');
const Item = require('../src/models/item.model');
const logger = require('../src/config/logger');
// Level tiers for reward items
const LEVEL_REWARD_ITEMS = [
  {
    name: 'level-frame-1',
    type: 'frame',
    price: 0, // Free item given as reward
    description: 'Special frame for reaching level 21-50',
    image: 'https://app.sawalive.live/public/assets/levelFrames/level-frame-1.png',
    file: 'https://app.sawalive.live/public/assets/levelFrames/level-frame-1.svga',
    isHidden: true,
  },
  {
    name: 'level-frame-2',
    type: 'frame',
    price: 0,
    description: 'Special frame for reaching level 51-80',
    image: 'https://app.sawalive.live/public/assets/levelFrames/level-frame-2.png',
    file: 'https://app.sawalive.live/public/assets/levelFrames/level-frame-2.svga',
    isHidden: true,
  },
  {
    name: 'level-frame-3',
    type: 'frame',
    price: 0,
    description: 'Special frame for reaching level 81-110',
    image: 'https://app.sawalive.live/public/assets/levelFrames/level-frame-3.png',
    file: 'https://app.sawalive.live/public/assets/levelFrames/level-frame-3.svga',
    isHidden: true,
  },
  {
    name: 'level-frame-4',
    type: 'frame',
    price: 0,
    description: 'Special frame for reaching level 111-150',
    image: 'https://app.sawalive.live/public/assets/levelFrames/level-frame-4.png',
    file: 'https://app.sawalive.live/public/assets/levelFrames/level-frame-4.svga',
    isHidden: true,
  },
  {
    name: 'level-frame-5',
    type: 'frame',
    price: 0,
    description: 'Special frame for reaching level 151-200',
    image: 'https://app.sawalive.live/public/assets/levelFrames/level-frame-5.png',
    file: 'https://app.sawalive.live/public/assets/levelFrames/level-frame-5.svga',
    isHidden: true,
  },
];

/**
 * Seed level reward items
 */
async function seedLevelRewardItems() {
  logger.info('Seeding level reward items...');

  for (const itemData of LEVEL_REWARD_ITEMS) {
    // Check if item exists
    const existingItem = await Item.findOne({ name: itemData.name });

    if (existingItem) {
      logger.info(`Item ${itemData.name} already exists, skipping`);
      // Optionally update existing item
      // await Item.updateOne({ name: itemData.name }, itemData);
      // logger.info(`Updated ${itemData.name}`);
    } else {
      // Create new item
      await Item.create(itemData);
      logger.info(`Created new item: ${itemData.name}`);
    }
  }

  logger.info('Level reward items seeding completed successfully');
}

// Run seeder if this file is executed directly
if (require.main === module) {
  // Connect to database
  mongoose.connect(config.mongoose.url, config.mongoose.options).then(() => {
    logger.info('Connected to MongoDB');
    seedLevelRewardItems()
      .then(() => {
        logger.info('Level reward items seeding completed');
        mongoose.disconnect();
      })
      .catch((error) => {
        logger.error('Level reward items seeding failed', error);
        mongoose.disconnect();
      });
  });
}

module.exports = {
  seedLevelRewardItems,
};
