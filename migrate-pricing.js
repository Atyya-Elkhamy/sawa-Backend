const mongoose = require('mongoose');
const config = require('./src/config/config');
const { initializeDefaultPricing } = require('./src/services/pricing.service');

const migratePricing = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('Connected to MongoDB');

    console.log('Initializing pricing data...');
    await initializeDefaultPricing();
    console.log('Pricing data initialized successfully');

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  migratePricing();
}

module.exports = migratePricing;
