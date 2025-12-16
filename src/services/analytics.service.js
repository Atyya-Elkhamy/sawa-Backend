// services/analytics.service.js

const mongoose = require('mongoose');
const PointAnalytics = require('../models/pointAnalytics.model');

/**
 * Get analytics for a user over a specific time interval
 * @param {ObjectId} userId - The ID of the user
 * @param {string} interval - The time interval (daily, weekly, monthly, all-time)
 * @param {ObjectId} [roomId] - Optional room ID for room-based analytics
 * @returns {Promise<object>} - Returns fame and rich points data
 */
const getUserAnalytics = async (userId, interval, roomId = null) => {
  const match = { user: new mongoose.Types.ObjectId(userId) };

  if (roomId) {
    match.roomId = new mongoose.Types.ObjectId(roomId);
  }

  let groupBy;
  let dateSubtract;

  switch (interval) {
    case 'daily':
      dateSubtract = { $dayOfYear: '$timestamp' };
      break;
    case 'weekly':
      dateSubtract = { $week: '$timestamp' };
      break;
    case 'monthly':
      dateSubtract = { $month: '$timestamp' };
      break;
    case 'all-time':
    default:
      dateSubtract = null;
      break;
  }

  if (dateSubtract) {
    groupBy = {
      _id: {
        year: { $year: '$timestamp' },
        interval: dateSubtract,
      },
      totalFamePoints: { $sum: '$famePoints' },
      totalRichPoints: { $sum: '$richPoints' },
    };
  } else {
    groupBy = {
      _id: null,
      totalFamePoints: { $sum: '$famePoints' },
      totalRichPoints: { $sum: '$richPoints' },
    };
  }

  const analytics = await PointAnalytics.aggregate([{ $match: match }, { $group: groupBy }]);

  return analytics.length ? analytics[0] : { totalFamePoints: 0, totalRichPoints: 0 };
};

module.exports = {
  getUserAnalytics,
};
