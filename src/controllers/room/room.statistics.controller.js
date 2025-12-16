const httpStatus = require('http-status');
const catchAsync = require('../../utils/catchAsync');
const { roomStatisticsService } = require('../../services');

/**
 * Get active participants in a room
 */
const getActiveParticipants = catchAsync(async (req, res) => {
  const data = await roomStatisticsService.getActiveParticipants(req.params.roomId);
  res.status(httpStatus.OK).send(data);
});

/**
 * Get historical participant data
 */
const getParticipantHistory = catchAsync(async (req, res) => {
  const data = await roomStatisticsService.getParticipantHistory(req.params.roomId);
  res.status(httpStatus.OK).send(data);
});

module.exports = {
  getActiveParticipants,
  getParticipantHistory,
};
