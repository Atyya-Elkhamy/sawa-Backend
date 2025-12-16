const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const analyticsService = require('../services/analytics.service');

const getUserAnalytics = catchAsync(async (req, res) => {
  const { interval, roomId } = req.query;
  const analytics = await analyticsService.getUserAnalytics(req.user.id, interval, roomId);
  res.status(httpStatus.OK).send(analytics);
});

module.exports = {
  getUserAnalytics,
};
