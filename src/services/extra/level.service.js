// services/levelService.js

const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');
const { User } = require('../../models');
const BoughtItem = require('../../models/boughtItem.model');
const Item = require('../../models/item.model');
const logger = require('../../config/logger');
const levelTable = require('../../utils/levelTable');

// Get MAX_LEVEL from the level table data
const MAX_LEVEL = levelTable.getMaxLevel();

// Level tiers for reward items
const LEVEL_TIER_REWARDS = [
  { min: 21, max: 50, itemName: 'level-frame-1' },
  { min: 51, max: 80, itemName: 'level-frame-2' },
  { min: 81, max: 110, itemName: 'level-frame-3' },
  { min: 111, max: 150, itemName: 'level-frame-4' },
  { min: 151, max: 200, itemName: 'level-frame-5' },
];

/**
 * Calculates the minimum points required for a given level using the level table data.
 * @param {number} level - The level to calculate the minimum points for.
 * @returns {number} - The minimum points required for the level.
 */
const calculateMinPoints = (level) => {
  return levelTable.getMinimumAmountForLevel(level);
};

/**
 * Dynamically calculates the user's level based on total points using the level table data.
 * @param {number} totalPoints - The total points the user has.
 * @returns {number} - The calculated level.
 */
const calculateLevel = (totalPoints) => {
  return levelTable.calculateLevelFromAmount(totalPoints);
};

/**
 * Calculates the number of weekly gifts based on the current level.
 * Increases by 10 every 40 levels, starting at 0.
 * @param {number} level - The current level.
 * @returns {number} - The number of weekly gifts.
 */
const calculateWeeklyGifts = (level) => {
  if (level < 1) return 0; // No gifts for level 0
  return Math.floor(level / 40) * 10;
};

/**
 * Checks if user has reached a new level tier and awards the corresponding item.
 * @param {object} user - The user object with the updated level.
 * @param {number} oldLevel - The user's previous level.
 * @param {object} session - Database session (optional).
 * @returns {Promise<object|null>} The awarded item or null if no reward.
 */
const checkAndAwardLevelItem = async (user, oldLevel, session = null) => {
  try {
    // Skip if level hasn't changed or decreased
    logger.info(`itemAwardUser ${user._id} level changed from ${oldLevel} to ${user.level}`);
    if (user.level <= oldLevel) {
      return null;
    }

    // Find the tier that the user has reached
    const reachedTier = LEVEL_TIER_REWARDS.find(
      (tier) => user.level >= tier.min && user.level <= tier.max && oldLevel < tier.min
    );

    if (!reachedTier) {
      return null;
    }

    // Get the item by name
    const item = await Item.findOne({ name: reachedTier.itemName });
    if (!item) {
      logger.error(`Level reward item "${reachedTier.itemName}" not found in the database`);
      return null;
    }

    // Check if the user already has this item
    const existingItem = await BoughtItem.findOne({
      user: user._id,
      item: item._id,
    });

    if (existingItem) {
      logger.info(`User ${user._id} already has the level reward item "${reachedTier.itemName}"`);
      return null;
    }

    // Create a new bought item record
    // make it expire after infinite time
    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 100); // Set
    const boughtItem = new BoughtItem({
      user: user._id,
      item: item._id,
      expirationDate: expirationDate,
      metadata: {
        source: 'level-reward',
        tier: `${reachedTier.min}-${reachedTier.max}`,
      },
    });

    const saveOptions = {};
    if (session) {
      saveOptions.session = session;
    }

    await boughtItem.save(saveOptions);

    logger.info(`Awarded level reward item "${reachedTier.itemName}" to user ${user._id} for reaching level ${user.level}`);

    return item;
  } catch (error) {
    logger.error('Error awarding level item:', error);
    return null;
  }
};

/**
 * Updates the user's level points and recalculates their level and weekly gifts.
 * @param {string} userId - The ID of the user.
 * @param {number} pointsEarned - The points to add.
 * @param {object} session - The database session (optional).
 * @returns {object} - The updated user object.
 */
const updateLevelPoints = async (userId, pointsEarned, session = null) => {
  // Increment the user's levelPoints by pointsEarned
  const updateOptions = { new: true };
  if (session) {
    updateOptions.session = session;
  }

  const user = await User.findByIdAndUpdate(userId, { $inc: { levelPoints: pointsEarned } }, updateOptions);

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }

  // Store the old level for comparison
  const oldLevel = user.level;

  // Calculate the new level based on updated points
  const newLevel = calculateLevel(user.levelPoints);
  const newWeeklyGifts = calculateWeeklyGifts(newLevel);

  // Update the user's level and weeklyGifts if they have changed
  logger.info(`User ${userId} level updated from ${oldLevel} to ${newLevel}`);
  if (user.level !== newLevel || user.weeklyGifts !== newWeeklyGifts) {
    user.level = newLevel;
    user.weeklyGifts = newWeeklyGifts;

    const saveOptions = {};
    if (session) {
      saveOptions.session = session;
    }

    await user.save(saveOptions);

    // Check if the user has reached a new level tier and award the item
    await checkAndAwardLevelItem(user, oldLevel, session);
  }

  return user;
};

/**
 * Calculates the remaining points required to reach the next level using the level table data.
 * @param {number} totalPoints - The user's total points.
 * @param {number} currentLevel - The user's current level.
 * @returns {object} - An object containing remainingPoints, currentPoints, and minPointsNextLevel.
 */
const calculateRemainingPointsToNextLevel = (totalPoints, currentLevel) => {
  return levelTable.getRemainingAmountToNextLevel(totalPoints, currentLevel);
};

/**
 * Retrieves the user's current level, remaining points to next level, and weekly gifts.
 * @param {string} userId - The ID of the user.
 * @returns {object} - An object containing level, remainingPoints, currentPoints, and weeklyGifts.
 */
const getLevel = async (userId) => {
  const user = await User.findById(userId).select('level levelPoints weeklyGifts');

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }

  // Calculate the current level based on points
  const currentLevel = calculateLevel(user.levelPoints);
  const newWeeklyGifts = calculateWeeklyGifts(currentLevel);

  // Calculate remaining points to next level
  const { currentPoints, minPointsNextLevel } = calculateRemainingPointsToNextLevel(user.levelPoints, currentLevel);

  // Update the user's level and weeklyGifts if they have changed
  if (user.level !== currentLevel || user.weeklyGifts !== newWeeklyGifts) {
    user.level = currentLevel;
    user.weeklyGifts = newWeeklyGifts;
    await user.save();
  }

  return {
    level: currentLevel,
    remainingPoints: minPointsNextLevel,
    currentPoints,
    weeklyGifts: newWeeklyGifts,
  };
};

module.exports = {
  calculateLevel,
  updateLevelPoints,
  calculateRemainingPointsToNextLevel,
  getLevel,
  checkAndAwardLevelItem,
};
