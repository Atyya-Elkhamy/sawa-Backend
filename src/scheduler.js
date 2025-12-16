const cron = require('node-cron');
const logger = require('./config/logger');
const { resetAccumulated } = require('./services/accumalatedCharged/accumulated.charged.service');
const { resetRoomCharizmaCount } = require('./services/room/room.service');
const { deleteMonthlyContributions } = require('./services/group/groupContribution.service');
const BoughtItem = require('./models/boughtItem.model');
const User = require('./models/user.model');
const Room = require('./models/room/room.model');
const { distributeWeeklyGifts, distributeDailyGifts } = require('./services/extra/giftDistribution.service');
const { processScheduledDeletions } = require('./services/scheduledDeletion.service');
const { cleanupExpiredSpecialIds } = require('./utils/schedulers/specialIdCleanup');
const { deductWeeklyPoints } = require('./utils/schedulers/pointDeduction');
const { runMongoBackup } = require('./utils/backups/mongoBackup');
const { cleanupOldChatMessages } = require('./services/chat/chatCleanup.service');


cron.schedule('0 0 * * *', async () => {
  try {
    logger.info('Starting cleanup every day at midnight...');

    await Promise.all([
      BoughtItem.cleanUpExpiredItems(),
      Room.cleanUpExpiredItems(),
      User.cleanUpExpiredItems(),
    ]);

    logger.info('Cleanup completed successfully.');
  } catch (error) {
    logger.error('Error during cleanup:', error);
  }
});

// Schedule a task to run every Friday at midnight
cron.schedule('0 0 * * 5', async () => {
  try {
    logger.info('Resetting rooms charizma count...');
    await resetRoomCharizmaCount();
    logger.info('Rooms charizma count reset completed successfully.');
  } catch (error) {
    logger.error('Error resetting room charizma count:', error);
  }
});

// Distribute weekly gifts based on user levels every Friday at midnight
cron.schedule('0 0 * * 5', async () => {
  try {
    logger.info('Starting weekly gift distribution...');
    // You can specify a gift ID here, or leave it empty to use the fallback logic
    const giftName = 'المارد'; // Replace with your actual gift ID
    const result = await distributeWeeklyGifts(giftName);
    logger.info(
      `Weekly gift distribution completed. Distributed ${result.totalGiftsDistributed} gifts to ${result.totalUsers} users.`
    );
  } catch (error) {
    logger.error('Error distributing weekly gifts:', error);
  }
});

// Deduct 30% from famePoints and richPoints for all users every Friday at midnight
cron.schedule('0 0 * * 5', async () => {
  try {
    logger.info('Starting weekly point deduction...');
    const result = await deductWeeklyPoints();
    logger.info(`Weekly point deduction completed. Updated ${result.modifiedCount} users.`);
  } catch (error) {
    logger.error('Error during weekly point deduction:', error);
  }
});

// Distribute daily gifts to all users every day at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    logger.info('Starting daily gift distribution...');
    // You can specify a gift ID here, or leave it empty to use the fallback logic
    const giftName = 'قلب'; // Replace with your actual gift ID
    const result = await distributeDailyGifts(giftName);
    logger.info(
      `Daily gift distribution completed. Distributed ${result.totalGiftsDistributed} gifts to ${result.totalUsers} users.`
    );
  } catch (error) {
    logger.error('Error distributing daily gifts:', error);
  }
});

// cron job on every 1st of the month at midnight
// Reset weekly points every Friday at midnight (00:00)
cron.schedule('0 0 * * 5', async () => {
  try {
    logger.info('Starting weekly accumulated points reset...');
    await resetAccumulated('weekly');
    logger.info('Weekly accumulated points reset completed successfully.');
  } catch (error) {
    logger.error('Error resetting weekly accumulated points:', error);
  }
});

// Reset monthly points at midnight (00:00) on the first day of each month
cron.schedule('0 0 1 * *', async () => {
  try {
    logger.info('Starting monthly accumulated points reset...');
    await resetAccumulated('monthly');
    logger.info('Monthly accumulated points reset completed successfully.');
  } catch (error) {
    logger.error('Error resetting monthly accumulated points:', error);
  }
});

// delete monthly contributions
cron.schedule('0 0 1 * *', async () => {
  try {
    logger.info('Deleting monthly contributions...');
    await deleteMonthlyContributions();
    logger.info('Monthly contributions deleted successfully.');
  } catch (error) {
    logger.error('Error deleting monthly contributions:', error);
  }
});

// Process scheduled user account deletions every hour
cron.schedule('0 * * * *', async () => {
  try {
    logger.info('Starting scheduled user deletion process...');
    const result = await processScheduledDeletions();
    logger.info(`Scheduled deletion process completed. Deleted ${result.deleted} accounts, ${result.errors.length} errors.`);
    if (result.errors.length > 0) {
      logger.error('Deletion errors:', result.errors);
    }
  } catch (error) {
    logger.error('Error in scheduled deletion process:', error);
  }
});

// Schedule special ID cleanup every day at 1 AM
cron.schedule('0 1 * * *', async () => {
  try {
    logger.info('Starting special ID cleanup...');
    await cleanupExpiredSpecialIds();
    logger.info('Special ID cleanup completed successfully.');
  } catch (error) {
    logger.error('Error during special ID cleanup:', error);
  }
});

// Handle process events for graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Stopping cron jobs...');
  cron.getTasks().forEach((task) => task.stop());
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Stopping cron jobs...');
  cron.getTasks().forEach((task) => task.stop());
});

// Daily database backup at 00:00 server time
cron.schedule('0 0 * * *', async () => {
  try {
    logger.info('Starting daily MongoDB backup...');
    const result = await runMongoBackup({ scheduleTag: 'daily' });
    logger.info(`Daily MongoDB backup finished: ${JSON.stringify(result)}`);
  } catch (error) {
    logger.error('Error during daily MongoDB backup: %s', error.message);
  }
});

// Clean up old chat messages (images and voice messages older than 30 days) daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  try {
    logger.info('Starting old chat messages cleanup...');
    const result = await cleanupOldChatMessages();
    logger.info(`Old chat messages cleanup completed. Processed: ${result.totalProcessed}, Success: ${result.successfulDeletions}, Failed: ${result.failedDeletions}`);
    if (result.errors.length > 0) {
      logger.error('Chat cleanup errors:', result.errors);
    }
  } catch (error) {
    logger.error('Error during old chat messages cleanup:', error);
  }
});
module.exports = cron;

