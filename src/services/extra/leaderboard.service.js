const httpStatus = require('http-status');
const mongoose = require('mongoose');
const { GiftTransaction, User, Room } = require('../../models');
const {
  getStartOfToday,
  getStartOfWeek,
  getStartOfMonth,
  calculateFormattedTimeLeft,
  getStartOfNextDay,
  getStartOfNextWeek,
  getStartOfNextMonth,
} = require('../../utils/timePeriods');
const { redisClient } = require('../../config/redis');
const ApiError = require('../../utils/ApiError');

const { ObjectId } = mongoose.Types;

const REDIS_EXPIRATION_TIME = 60; // Cache for 1 minute
const REDIS_KEY = process.env.REDIS_KEY || 'redis_';

/**
 * Get cached data from Redis
 * @param {string} key - Redis key
 * @returns {object | null} - Cached data or null if not found
 */
const getCachedData = async (key) => {
  key = `${REDIS_KEY}${key}`;
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
};

/**
 * Cache data to Redis
 * @param {string} key - Redis key
 * @param {object} data - Data to cache
 * @param expirationTime
 */
const cacheData = async (key, data, expirationTime = REDIS_EXPIRATION_TIME) => {
  key = `${REDIS_KEY}${key}`;
  await redisClient.set(key, JSON.stringify(data), {
    EX: expirationTime, // Expiration time in seconds
    NX: false,
  });
};

/**
 * Get leaderboard data with aggregation pipeline
 * @param {string} type - 'fame' or 'rich'
 * @param {string} period - 'today', 'week', 'month'
 * @param {string} roomId - Optional room ID
 * @returns {Promise<{leaderboard: Array, totalPoints: number}>}
 */
const getLeaderboardData = async (type = 'fame', period = 'today', roomId = '') => {
  let startDate;
  switch (period) {
    case 'today':
      startDate = getStartOfToday();
      break;
    case 'week':
      startDate = getStartOfWeek();
      break;
    case 'month':
      startDate = getStartOfMonth();
      break;
    default:
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid period specified', 'فترة غير صالحة');
  }

  const matchField = type === 'fame' ? 'recipient' : 'sender';
  const match = { date: { $gte: startDate } };

  if (roomId) {
    match.room = new ObjectId(roomId);
  }

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: `$${matchField}`,
        totalPoints: { $sum: '$price' },
      },
    },
    {
      $match: {
        totalPoints: { $gt: 0 },
      },
    },
    { $sort: { totalPoints: -1 } },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'userDetails',
      },
    },
    { $unwind: '$userDetails' },
    {
      $project: {
        userId: '$userDetails.userId',
        id: '$userDetails._id',
        name: '$userDetails.name',
        avatar: '$userDetails.avatar',
        frame: '$userDetails.frame',
        chargeLevel: '$userDetails.chargeLevel',
        level: '$userDetails.level',
        famePoints: '$userDetails.famePoints',
        richPoints: '$userDetails.richPoints',
        isMale: '$userDetails.isMale',
        dateOfBirth: '$userDetails.dateOfBirth',
        pro: '$userDetails.pro',
        totalPoints: 1,
      },
    },
  ];

  const results = await GiftTransaction.aggregate(pipeline).exec();
  const currentDate = new Date();
  const leaderboard = results.map((user) => ({
    userId: user.userId,
    id: user.id,
    name: user.name,
    avatar: user.avatar,
    frame: user.frame,
    chargeLevel: user.chargeLevel,
    level: user.level,
    famePoints: user.famePoints,
    richPoints: user.richPoints,
    isMale: user.isMale,
    dateOfBirth: user.dateOfBirth,
    pro: user.pro,
    totalPoints: user.totalPoints,
    isPro: user.pro ? user.pro.expirationDate > currentDate : false,
  }));
  const totalPoints = results.reduce((sum, user) => sum + user.totalPoints, 0);

  return { leaderboard, totalPoints };
};

/**
 * Get user's rank from leaderboard
 * @param {object} params - { type, period, userId }
 * @param params.type
 * @param params.period
 * @param params.userId
 * @returns {Promise<object|null>} - User's rank data or null if not found
 */
const getUserRank = async ({ type, period, userId }) => {
  const { leaderboard } = await getLeaderboardData(type, period);
  const userIndex = leaderboard.findIndex((user) => user.userId.toString() === userId);

  if (userIndex === -1) return null;

  return {
    rank: userIndex + 1,
    ...leaderboard[userIndex],
  };
};

/**
 * Get top three users
 * @param {string} type - 'fame' or 'rich'
 * @param {string} period - 'today', 'week', 'month'
 * @returns {Promise<Array>} - Top 3 users with details
 */
const getTopThreeUsers = async (type, period) => {
  const { leaderboard } = await getLeaderboardData(type, period);
  return leaderboard.slice(0, 3).map((user, index) => ({
    rank: index + 1,
    ...user,
  }));
};

/**
 * Get paginated leaderboard
 * @param {object} params - { type, period, page, limit, roomId }
 * @param params.type
 * @param params.period
 * @param params.page
 * @param params.limit
 * @param params.roomId
 * @returns {Promise<{data: Array, totalUsers: number, totalPoints: number, timeLeft: string}>}
 */
const getLeaderboard = async ({ type, period, page, limit, roomId }) => {
  const { leaderboard, totalPoints } = await getLeaderboardData(type, period, roomId);

  // Calculate time left for the period
  let endDate;
  switch (period) {
    case 'today':
      endDate = getStartOfNextDay();
      break;
    case 'week':
      endDate = getStartOfNextWeek();
      break;
    case 'month':
      endDate = getStartOfNextMonth();
      break;
  }
  const timeLeft = calculateFormattedTimeLeft(endDate);

  // Handle pagination
  const totalUsers = leaderboard.length;
  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);
  const startIndex = (pageNumber - 1) * limitNumber;
  const endIndex = pageNumber * limitNumber;

  const paginatedData = leaderboard.slice(startIndex, endIndex).map((user, index) => ({
    rank: startIndex + index + 1,
    ...user,
  }));

  return {
    data: paginatedData,
    totalUsers,
    totalPoints,
    timeLeft,
  };
};

/**
 * Get room leaderboard data
 * @param {object} params
 * @param {string} params.period - 'today' or 'week'
 * @param {string} params.roomId - Room ID
 * @param {string} params.userId - Current user ID
 * @param {string} params.type - 'fame' or 'rich'
 * @returns {Promise<{topUsers: Array, userPoints: number, totalDaily?: number, totalWeekly?: number}>}
 */
const getRoomLeaderboardData = async ({ period = 'today', roomId = '', userId, type = 'fame' }) => {
  if (!['today', 'week'].includes(period)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid period. Allowed values: "today", "week"', 'فترة غير صالحة');
  }

  const { leaderboard, totalPoints } = await getLeaderboardData(type, period, roomId);

  // Find user's points
  const userEntry = leaderboard.find((user) => user.id.toString() == userId);
  const userPoints = userEntry ? userEntry.totalPoints : 0;

  // Get top 50 users with ranks
  const topUsers = leaderboard.slice(0, 50).map((user, index) => ({
    rank: index + 1,
    ...user,
  }));

  const data = {
    topUsers,
    userPoints,
  };

  // Add period-specific total points
  if (period === 'today') {
    data.totalDaily = totalPoints;
  } else {
    data.totalWeekly = totalPoints;
  }

  return data;
};

module.exports = {
  getLeaderboard,
  getUserRank,
  getTopThreeUsers,
  getRoomLeaderboardData,
};
