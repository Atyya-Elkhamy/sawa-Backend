/**
 * Seed script to create admin settings in the database
 * Run with: node seed/admin-settings-seed.js
 */

const mongoose = require('mongoose');
const config = require('../src/config/config');
const AdminSettings = require('../src/models/adminSettings.model');
const logger = require('../src/config/logger');

const seedAdminSettings = async () => {
    const adminData = {
        username: process.env.ADMIN_USERNAME || 'admin',
        password: process.env.ADMIN_PASSWORD || 'admin123',
        email: process.env.ADMIN_EMAIL || 'admin@rootmatrix.cloud	',
    };

    try {
        logger.info('🌱 Seeding admin settings...');

        const existingAdmin = await AdminSettings.findOne({ username: adminData.username });
        if (!existingAdmin) {
            await AdminSettings.create(adminData);
            logger.info(`✅ Admin user ${adminData.username} created successfully.`);
        } else {
            logger.info(`ℹ️ Admin user ${adminData.username} already exists in the database.`);
        }

        logger.info('🎉 Admin settings seeding completed.');
    } catch (error) {
        logger.error('❌ Error seeding admin settings:', error);
        throw error;
    }
};

/**
 * Main function to run the seeder
 */
async function runSeeder() {
    try {
        // Connect to database
        await mongoose.connect(config.mongoose.url, config.mongoose.options);
        logger.info('✅ Connected to MongoDB');

        await seedAdminSettings();

    } catch (error) {
        logger.error('❌ Seeding failed:', error);
        throw error;
    } finally {
        // Disconnect from database
        await mongoose.disconnect();
        logger.info('🔌 Disconnected from MongoDB');
    }
}

// Run the seeder if this file is executed directly
if (require.main === module) {
    runSeeder();
}

module.exports = { seedAdminSettings };
