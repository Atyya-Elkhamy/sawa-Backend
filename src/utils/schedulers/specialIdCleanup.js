// utils/schedulers/specialIdCleanup.js

const cron = require('node-cron');
const UserSpecialId = require('../../models/userSpecialId.model');
const User = require('../../models/user.model');
const logger = require('../../config/logger');

/**
 * Clean up expired special IDs and update user models
 */
const cleanupExpiredSpecialIds = async () => {
  try {
    logger.info('Starting special ID cleanup task...');

    // Find all expired special IDs
    const expiredSpecialIds = await UserSpecialId.find({
      expirationDate: { $lt: new Date() },
      isActive: true,
    });

    if (expiredSpecialIds.length > 0) {
      logger.info(`Found ${expiredSpecialIds.length} expired special IDs`);

      // Update users who have expired active special IDs
      // For each expired active special id, run the deactivate logic so userId is reverted
      for (const sid of expiredSpecialIds) {
        try {
          await UserSpecialId.deactivateForUser(sid.user, sid._id);
        } catch (err) {
          logger.error('Error deactivating special id %s for user %s: %o', sid._id, sid.user, err);
        }
      }

      logger.info(`Cleaned up ${expiredSpecialIds.length} expired special IDs (deactivated and reverted userIds)`);
    }

    // Clean up old expired records (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deletedCount = await UserSpecialId.deleteMany({
      expirationDate: { $lt: thirtyDaysAgo },
      isActive: false,
    });

    if (deletedCount.deletedCount > 0) {
      logger.info(`Deleted ${deletedCount.deletedCount} old expired special ID records`);
    }

    logger.info('Special ID cleanup task completed successfully');
  } catch (error) {
    logger.error('Error during special ID cleanup:', error);
  }
};

/**
 * Schedule the cleanup task to run daily at 2 AM
 */
const scheduleSpecialIdCleanup = () => {
  // Run every day at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    await cleanupExpiredSpecialIds();
  }, {
    scheduled: true,
    timezone: 'UTC',
  });

  logger.info('Special ID cleanup scheduler initialized - runs daily at 2:00 AM UTC');
};

module.exports = {
  cleanupExpiredSpecialIds,
  scheduleSpecialIdCleanup,
};
