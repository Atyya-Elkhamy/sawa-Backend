// controllers/leaderboard.controller.js

const httpStatus = require('http-status');
const leaderboardService = require('../services/extra/leaderboard.service');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

/**
 * @description    Get Historical Leaderboard
 * @route   GET /api/leaderboard
 * @access  Public (Adjust access as needed)
 */
/**
 * @description    Get Paginated Historical Leaderboard
 * @route   GET /api/leaderboard
 * @access  Public (Adjust as needed)
 */
const getHistoricalLeaderboard = catchAsync(async (req, res) => {
  const { type, period, roomId } = req.query;
  const MAX_ITEMS = 100; 
  const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limitNum = Math.max(1, parseInt(req.query.limit, 10) || 20);

  // Fetch leaderboard data from the service using the requested page and limit
  const { data, totalUsers, totalPoints, timeLeft } = await leaderboardService.getLeaderboard({
    type,
    period,
    page: pageNum,
    limit: limitNum,
    roomId,
  });

  // Cap total items considered by pagination to MAX_ITEMS
  const cappedTotalUsers = Math.min(totalUsers, MAX_ITEMS);
  const totalPages = Math.ceil(cappedTotalUsers / limitNum) || 0;

  // Trim users array so that (page * limit) never exceeds MAX_ITEMS
  const startIndex = (pageNum - 1) * limitNum;
  let users = data;
  if (startIndex >= MAX_ITEMS) {
    users = [];
  } else {
    const remaining = MAX_ITEMS - startIndex;
    if (remaining < limitNum) {
      users = Array.isArray(data) ? data.slice(0, Math.max(0, remaining)) : [];
    }
  }

  // Respond with paginated leaderboard data (capped)
  res.status(200).json({
    page: pageNum,
    limit: limitNum,
    totalPages,
    totalUsers: cappedTotalUsers,
    nextPage: pageNum < totalPages ? pageNum + 1 : null,
    users,
    totalPoints,
    timeLeft,
  });
});

/**
 * @description    Get User Rank in Historical Leaderboard
 * @route   GET /api/leaderboard/rank
 * @access  Private (Requires Authentication)
 */
const getUserRank = catchAsync(async (req, res) => {
  const { type, period } = req.query;
  const userId = req.user.id; // Assumes authentication middleware sets req.user

  // Fetch user rank from the service
  const rank = await leaderboardService.getUserRank({
    type,
    period,
    userId,
  });

  if (rank === null) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found in leaderboard', 'المستخدم غير موجود في قائمة المتصدرين');
  }

  res.status(200).json({
    userId,
    rank,
  });
});
const getTopUsers = catchAsync(async (req, res) => {
  const { type, period } = req.query;

  // Fetch top three users from the service
  const topThreeUsers = await leaderboardService.getTopThreeUsers(type || 'fame', period || 'today');

  // Respond with top three users
  res.status(200).json(topThreeUsers);
});

module.exports = {
  getHistoricalLeaderboard,
  getTopUsers,
  getUserRank,
};
