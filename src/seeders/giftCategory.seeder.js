const mongoose = require('mongoose');
const GiftCategory = require('../models/giftCategory.model');
const logger = require('../config/logger');

const seedGiftCategories = async () => {
  const categories = [
    { name: 'Birthday', nameAr: 'عيد ميلاد' },
    { name: 'Anniversary', nameAr: 'ذكرى سنوية' },
    { name: 'Holiday', nameAr: 'عطلة' },
    { name: 'Special', nameAr: 'خاص' },
  ];

  try {
    await mongoose.connect(process.env.MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    for (const category of categories) {
      const existingCategory = await GiftCategory.findOne({ name: category?.name });
      if (!existingCategory) {
        await GiftCategory.create(category);
        logger.info(`Category ${category?.name} added to the database.`);
      } else {
        logger.info(`Category ${category?.name} already exists in the database.`);
      }
    }

    logger.info('Gift categories seeding completed.');
    mongoose.connection.close();
  } catch (error) {
    logger.error('Error seeding gift categories:', error.message);
    mongoose.connection.close();
  }
};

seedGiftCategories();
