const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { hostActivityService } = require('../services');
const ApiError = require('../utils/ApiError');

/**
 * Get total time spent by a host in a room
 */
const getHostTotalTime = catchAsync(async (req, res) => {
  const data = await hostActivityService.getHostTotalTime(req.params.roomId, req.params.hostId);
  res.status(httpStatus.OK).send(data);
});

/**
 * Get historical activity data for a host in a room
 */
const getHostActivityHistory = catchAsync(async (req, res) => {
  const data = await hostActivityService.getHostActivityHistory(req.params.roomId, req.params.hostId);
  res.status(httpStatus.OK).send(data);
});

module.exports = {
  getHostTotalTime,
  getHostActivityHistory,
};
