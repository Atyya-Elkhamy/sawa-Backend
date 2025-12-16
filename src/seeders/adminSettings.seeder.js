const mongoose = require('mongoose');
const AdminSettings = require('../models/adminSettings.model');
const logger = require('../config/logger');

const seedAdminSettings = async () => {
    const adminData = {
        username: process.env.ADMIN_USERNAME || 'admin',
        password: process.env.ADMIN_PASSWORD || 'admin123',
        email: process.env.ADMIN_EMAIL || 'admin@rootmatrix.cloud	',
        role: 'superadmin',
    };

    const existingAdmin = await AdminSettings.findOne({ username: adminData.username });
    if (!existingAdmin) {
        await AdminSettings.create(adminData);
        logger.info(`Admin user ${adminData.username} created successfully.`);
    } else {
        logger.info(`Admin user ${adminData.username} already exists in the database.`);
    }
};

module.exports = { seedAdminSettings };

// If run directly
if (require.main === module) {
    const runSeeder = async () => {
        try {
            await mongoose.connect(process.env.MONGODB_URL, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });

            await seedAdminSettings();

            logger.info('Admin settings seeding completed.');
            mongoose.connection.close();
        } catch (error) {
            logger.error('Error seeding admin settings:', error.message);
            mongoose.connection.close();
        }
    };

    runSeeder();
}
