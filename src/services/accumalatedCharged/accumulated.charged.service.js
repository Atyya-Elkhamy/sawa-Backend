const Accumulated = require('../../models/accumulatedCharge/accumulated.charged.model');
const ApiError = require('../../utils/ApiError');
const { calculateFormattedTimeLeft } = require('../../utils/timePeriods');

// Update or create accumulated points
const increaseAccumulation = async (userId, amountToAdd) => {
  try {
    return await Accumulated.updateAccumulation(userId, amountToAdd);
  } catch (error) {
    console.error('Error updating accumulation:', error.message);
  }
};

// Get accumulated points for a user, create new if not found
const getAccumulation = async (userId) => {
  try {
    return await Accumulated.getAccumulation(userId);
  } catch (error) {
    console.error('Error getting accumulation:', error.message);
  }
};

// Reset accumulated points
const resetAccumulated = async (period = 'weekly') => {
  try {
    await Accumulated.resetAccumulated(period);
  } catch (error) {
    console.error('Error resetting accumulated points:', error.message);
  }
};

const collectPrize = async (userId, amountToCollect, period = 'weekly') => {
  const accumulated = await getAccumulation(userId);
  if (period === 'weekly') {
    if (accumulated.weeklyAvailable < amountToCollect) {
      console.log('Not enough points to collect');
      throw new ApiError(400, 'Not enough points to collect', 'لا يوجد نقاط كافية للسحب');
    }
    accumulated.weeklyAvailable -= amountToCollect;
  } else if (period === 'monthly') {
    if (accumulated.monthlyAvailable < amountToCollect) {
      throw new ApiError(400, 'Not enough points to collect', 'لا يوجد نقاط كافية للسحب');
    }
    accumulated.monthlyAvailable -= amountToCollect;
  }
  await accumulated.save();
  return accumulated.toObject();
};

// Get top 3 users with highest accumulated points
const getTopThree = async (period = 'weekly') => {
  try {
    return await Accumulated.getTopThree(period);
  } catch (error) {
    console.error('Error getting top three users:', error.message);
    throw error;
  }
};


const getEndOfWeekTimeLeft = () => {
  const now = new Date();
  const endOfWeek = new Date();

  // If it's already Friday after midnight, set to next Friday
  if (endOfWeek.getDay() === 5 && endOfWeek.getHours() >= 0) {
    endOfWeek.setDate(endOfWeek.getDate() + 7);
  }

  // Set to next Friday
  endOfWeek.setDate(endOfWeek.getDate() + ((5 + 7 - endOfWeek.getDay()) % 7));
  endOfWeek.setHours(0, 0, 0, 0); // Set to midnight

  return calculateFormattedTimeLeft(endOfWeek);
};

const getEndOfMonthTimeLeft = () => {
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1); // First day of next month
  endOfMonth.setHours(0, 0, 0, 0); // Set to midnight

  return calculateFormattedTimeLeft(endOfMonth);
};

const getTimeLeft = (period) => {
  if (period === 'weekly') {
    return getEndOfWeekTimeLeft();
  }
  if (period === 'monthly') {
    return getEndOfMonthTimeLeft();
  }
  throw new Error('Invalid period specified');
};
module.exports = {
  increaseAccumulation,
  getAccumulation,
  resetAccumulated,
  getTopThree,
  collectPrize,
  getEndOfWeekTimeLeft,
  getEndOfMonthTimeLeft,
  getTimeLeft,
};
