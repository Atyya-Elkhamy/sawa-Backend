// chargeService.js

const httpStatus = require('http-status');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const accumulateChargedService = require('./accumalatedCharged/accumulated.charged.service');
const userService = require('./user.service');
const levelTable = require('../utils/levelTable');

// Get MAX_CHARGE_LEVEL from the level table data
const MAX_CHARGE_LEVEL = levelTable.getMaxLevel();

/**
 * Calculates the minimum amount required for a given charge level using the level table data.
 * @param {number} level - The charge level to calculate the minimum amount for.
 * @returns {number} - The minimum amount required for the charge level.
 */
const calculateMinAmount = (level) => {
  return levelTable.getMinimumAmountForLevel(level);
};

/**
 * Dynamically calculates the user's charge level based on total charged amount using the level table data.
 * @param {number} totalAmount - The total amount the user has charged.
 * @returns {number} - The calculated charge level.
 */
const calculateChargeLevel = (totalAmount) => {
  return levelTable.calculateLevelFromAmount(totalAmount);
};

/**
 * Updates the user's total charged amount and recalculates their charge level.
 * @param {string} userId - The ID of the user.
 * @param {number} amount - The amount to add to the user's total charged amount.
 * @param {object} session - The database session (optional).
 * @returns {object} - The updated user object.
 */
const updateTotalChargedAmount = async (userId, amount, session = null) => {
  // Increment the user's totalChargedAmount by the amount
  const updateOptions = { new: true };
  if (session) {
    updateOptions.session = session;
  }

  const user = await User.findByIdAndUpdate(userId, { $inc: { totalChargedAmount: amount } }, updateOptions);

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }

  // Calculate the new charge level based on updated total amount
  const newChargeLevel = calculateChargeLevel(user.totalChargedAmount);

  // Update the user's chargeLevel if it has changed
  if (user.chargeLevel !== newChargeLevel) {
    user.chargeLevel = newChargeLevel;

    const saveOptions = {};
    if (session) {
      saveOptions.session = session;
    }

    await user.save(saveOptions);
  }

  // Update the user's accumulated points
  await accumulateChargedService.increaseAccumulation(userId, amount);

  return user;
};

/**
 * Adds credits to the user's account and updates their total charged amount and charge level.
 * @param {string} userId - The ID of the user.
 * @param {number} amount - The amount of credits to add.
 * @param creditAgencyUserId
 * @param {object} session - The database session (optional).
 * @returns {object} - The updated user object.
 */
const addCreditsToUser = async (userId, amount, creditAgencyUserId, session = null) => {
  const updateOptions = { new: true };
  if (session) {
    updateOptions.session = session;
  }

  // Add credits to the user's account
  await userService.increaseUserBalance(
    userId,
    amount,
    `transfer from credit agency ${creditAgencyUserId}`,
    `تحويل من وكالة شحن ${creditAgencyUserId}`
  );

  // Update the user's total charged amount and charge level
  const updatedUser = await updateTotalChargedAmount(userId, amount, session);

  return { user: updatedUser };
};

/**
 * Calculates the remaining amount required to reach the next charge level using the level table data.
 * @param {number} totalAmount - The user's total charged amount.
 * @param {number} currentLevel - The user's current charge level.
 * @returns {object} - An object containing remainingAmount, currentAmount, and minAmountNextLevel.
 */
const calculateRemainingAmountToNextLevel = (totalAmount, currentLevel) => {
  return levelTable.getRemainingAmountToNextLevel(totalAmount, currentLevel);
};

/**
 * Retrieves the user's current charge level and remaining amount to next level.
 * @param {string} userId - The ID of the user.
 * @returns {object} - An object containing chargeLevel, remainingAmount, and currentAmount.
 */
const getChargeLevel = async (userId) => {
  const user = await User.findById(userId).select('chargeLevel totalChargedAmount');

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }

  // Calculate the current charge level based on total charged amount
  const currentChargeLevel = calculateChargeLevel(user.totalChargedAmount);

  // Calculate remaining amount to next charge level
  const { currentPoints, minPointsNextLevel } = calculateRemainingAmountToNextLevel(
    user.totalChargedAmount,
    currentChargeLevel
  );

  // Update the user's chargeLevel if it has changed
  if (user.chargeLevel !== currentChargeLevel) {
    user.chargeLevel = currentChargeLevel;
    await user.save();
  }


  return {
    chargeLevel: currentChargeLevel,
    remainingAmount: minPointsNextLevel,
    currentAmount: currentPoints
  };
};

module.exports = {
  addCreditsToUser,
  calculateChargeLevel,
  getChargeLevel,
  updateTotalChargedAmount,
  calculateRemainingAmountToNextLevel,
};
