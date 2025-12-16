/**
 * Seed script to create VIP stickers in the database
 * Run with: node seed/vip-stickers-seed.js
 */

const mongoose = require('mongoose');
const config = require('../src/config/config');
const Sticker = require('../src/models/chat/sticker.model');
const logger = require('../src/config/logger');

// VIP stickers for different VIP levels
const VIP_STICKERS = [];

// Generate 4 stickers for each VIP level from 2 to 7
for (let vipLevel = 2; vipLevel <= 7; vipLevel++) {
  for (let i = 1; i <= 4; i++) {
    VIP_STICKERS.push({
      name: `vip${vipLevel}-sticker-${i}`,
      category: `vip${vipLevel}`,
      image: `https://app.rootmatrix.cloud	/public/assets/vip-stickers/vip${vipLevel}/${i}.png`,
      file: `https://app.rootmatrix.cloud	/public/assets/vip-stickers/vip${vipLevel}/${i}.svga`,
      type: 'vip',
      vipLevel,
    });
  }
}

/**
 * Seed VIP stickers
 */
async function seedVipStickers() {
  logger.info('Seeding VIP stickers...');

  for (const stickerData of VIP_STICKERS) {
    // Check if sticker exists
    const existingSticker = await Sticker.findOne({
      name: stickerData.name,
      vipLevel: stickerData.vipLevel,
    });

    if (existingSticker) {
      logger.info(`Sticker ${stickerData.name} already exists, skipping`);
      // Optionally update existing sticker
      // await Sticker.updateOne({ name: stickerData.name }, stickerData);
      // logger.info(`Updated ${stickerData.name}`);
    } else {
      // Create new sticker
      await Sticker.create(stickerData);
      logger.info(`Created new sticker: ${stickerData.name} for VIP level ${stickerData.vipLevel}`);
    }
  }

  logger.info('VIP stickers seeding completed successfully');
}

// Run seeder if this file is executed directly
if (require.main === module) {
  // Connect to database
  mongoose.connect(config.mongoose.url, config.mongoose.options).then(() => {
    logger.info('Connected to MongoDB');
    seedVipStickers()
      .then(() => {
        logger.info('VIP stickers seeding completed');
        mongoose.disconnect();
      })
      .catch((error) => {
        logger.error('VIP stickers seeding failed', error);
        mongoose.disconnect();
      });
  });
}

module.exports = {
  seedVipStickers,
};
