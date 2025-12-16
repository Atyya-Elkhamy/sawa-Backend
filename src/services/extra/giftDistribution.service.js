const { User, Gift } = require('../../models');
const BoughtGift = require('../../models/boughtGifts.model');
const logger = require('../../config/logger');

// Default gift name for all users, can be overridden when calling the distributeWeeklyGifts function
const DEFAULT_WEEKLY_GIFT_NAME = 'weekly-gift';

// Default gift name for daily gifts
const DEFAULT_DAILY_GIFT_NAME = 'daily-gift';

/**
 * Level ranges and corresponding gift counts
 */
const LEVEL_GIFT_MAPPING = [
  { min: 51, max: 100, count: 1 },
  { min: 101, max: 150, count: 2 },
  { min: 151, max: 199, count: 3 },
  { min: 200, max: Infinity, count: 4 },
];

/**
 * Calculates the number of weekly gifts to give based on user level.
 * @param {number} level - The user's current level.
 * @returns {number} The number of gifts to give.
 */
const calculateWeeklyGiftsCount = (level) => {
  // Find the matching level range
  const range = LEVEL_GIFT_MAPPING.find((r) => level >= r.min && level <= r.max);
  return range ? range.count : 0;
};

/**
 * Processes a level range and creates bulk operations for gift distribution.
 * @param {object} range - The level range object containing min, max, and count.
 * @param {string} giftId - The ID of the gift to distribute.
 * @param {object} distribution - The distribution statistics object to update.
 * @returns {Array} An array of bulk operations.
 */
const processLevelRange = async (range, giftId, distribution) => {
  // Count users in this range
  const usersInRange = await User.countDocuments({
    level: { $gte: range.min, $lte: range.max },
  });

  const rangeKey = `${range.min}-${range.max === Infinity ? '+' : range.max}`;
  distribution.usersByLevel[rangeKey] = usersInRange;
  distribution.totalUsers += usersInRange;
  distribution.totalGiftsDistributed += usersInRange * range.count;

  if (usersInRange > 0) {
    // Get all user IDs in this level range
    const users = await User.find({ level: { $gte: range.min, $lte: range.max } })
      .select('_id')
      .lean();

    // Create bulk operations for this level range
    return users.map((user) => ({
      updateOne: {
        filter: { user: user._id, gift: giftId },
        update: { $inc: { quantity: range.count } },
        upsert: true,
      },
    }));
  }

  return [];
};

/**
 * Distributes weekly gifts to users based on their level.
 * @param {string} [giftName] - Optional gift name to override the default.
 * @returns {Promise<object>} Distribution statistics.
 */
const distributeWeeklyGifts = async (giftName) => {
  logger.info('Starting weekly gift distribution...');
  const startTime = Date.now();

  // Use provided gift name or fall back to default
  const giftNameToUse = giftName || DEFAULT_WEEKLY_GIFT_NAME;

  // Find the specific gift to distribute
  const gift = await Gift.findOne({ name: giftNameToUse });
  if (!gift) {
    logger.error(`Weekly gift with name ${giftNameToUse} not found`);
    throw new Error(`Weekly gift with name ${giftNameToUse} not found`);
  }

  // Stats object to track distribution
  const distribution = {
    totalUsers: 0,
    totalGiftsDistributed: 0,
    usersByLevel: {},
    processingTimeMs: 0,
  };

  // Process all level ranges and collect bulk operations
  const bulkOperationsPromises = LEVEL_GIFT_MAPPING.map((range) => processLevelRange(range, gift._id, distribution));

  const bulkOperationsArrays = await Promise.all(bulkOperationsPromises);
  const bulkOperations = bulkOperationsArrays.flat();

  // Execute the bulk operation if there are any operations
  if (bulkOperations.length > 0) {
    const result = await BoughtGift.bulkWrite(bulkOperations);
    logger.info(`Bulk write completed with ${result.upsertedCount} inserts and ${result.modifiedCount} updates`);
  } else {
    logger.info('No eligible users found for gift distribution');
  }

  distribution.processingTimeMs = Date.now() - startTime;
  logger.info(
    `Weekly gift distribution completed in ${distribution.processingTimeMs}ms. Distributed ${distribution.totalGiftsDistributed} gifts to ${distribution.totalUsers} users.`
  );

  return distribution;
};

/**
 * Distributes a daily gift to all users.
 * @param {string} [giftName] - Optional gift name to override the default.
 * @returns {Promise<object>} Distribution statistics.
 */
const distributeDailyGifts = async (giftName) => {
  logger.info('Starting daily gift distribution...');
  const startTime = Date.now();

  // Use provided gift name or fall back to default
  const giftNameToUse = giftName || DEFAULT_DAILY_GIFT_NAME;

  // Find the specific gift to distribute
  const gift = await Gift.findOne({ name: giftNameToUse });
  if (!gift) {
    logger.error(`Daily gift with name ${giftNameToUse} not found`);
    throw new Error(`Daily gift with name ${giftNameToUse} not found`);
  }

  // Get count of all active users
  const totalUsers = await User.countDocuments();

  // Stats object to track distribution
  const distribution = {
    totalUsers,
    totalGiftsDistributed: totalUsers,
    processingTimeMs: 0,
  };

  if (totalUsers > 0) {
    // Create bulk operations for all users
    logger.info(`Creating bulk gift distribution operations for ${totalUsers} users`);

    // Get all users in one query
    const allUsers = await User.find().select('_id').lean();

    // Create bulk operations
    const bulkOperations = allUsers.map((user) => ({
      updateOne: {
        filter: { user: user._id, gift: gift._id },
        update: { $inc: { quantity: 1 } },
        upsert: true,
      },
    }));

    // Execute the bulk operation
    const result = await BoughtGift.bulkWrite(bulkOperations);
    logger.info(`Bulk write completed with ${result.upsertedCount} inserts and ${result.modifiedCount} updates`);

    logger.info(`Gave 1 gift to each of ${totalUsers} users.`);
  } else {
    logger.info('No users found for gift distribution');
  }

  distribution.processingTimeMs = Date.now() - startTime;
  logger.info(
    `Daily gift distribution completed in ${distribution.processingTimeMs}ms. Distributed ${distribution.totalGiftsDistributed} gifts to ${distribution.totalUsers} users.`
  );
  return distribution;
};

module.exports = {
  calculateWeeklyGiftsCount,
  distributeWeeklyGifts,
  distributeDailyGifts,
};
