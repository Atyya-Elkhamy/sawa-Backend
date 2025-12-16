const User = require('../models/user.model');
const logger = require('../config/logger');

/**
 * Process scheduled account deletions
 * Deletes accounts that have been scheduled for deletion and the grace period has expired
 * @returns {Promise<{deleted: number, errors: string[]}>}
 */
const processScheduledDeletions = async () => {
  const now = new Date();
  let deletedCount = 0;
  const errors = [];

  try {
    // Find users whose deletion is scheduled and the scheduled time has passed
    const usersToDelete = await User.find({
      'deletionRequest.isActive': true,
      'deletionRequest.scheduledAt': { $lte: now },
    }).select('_id name deletionRequest');

    logger.info(`Found ${usersToDelete.length} users scheduled for deletion`);

    for (const user of usersToDelete) {
      try {
        logger.info(`Processing deletion for user ${user._id} (${user.name})`);

        // Use the deleteOne method which triggers the cascading delete middleware
        await user.deleteOne();

        deletedCount++;
        logger.info(`Successfully deleted user ${user._id}`);
      } catch (error) {
        const errorMsg = `Failed to delete user ${user._id}: ${error.message}`;
        logger.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    logger.info(`Scheduled deletion process completed. Deleted: ${deletedCount}, Errors: ${errors.length}`);

    return {
      deleted: deletedCount,
      errors,
    };
  } catch (error) {
    logger.error('Error in scheduled deletion process:', error);
    throw error;
  }
};

module.exports = {
  processScheduledDeletions,
};
