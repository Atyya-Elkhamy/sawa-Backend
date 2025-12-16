const catchAsync = require('../utils/catchAsync');
const micService = require('../services/room/room.mics.service');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');

exports.changeMicState = catchAsync(async (req, res) => {
  const { roomId, micNumber } = req.params;
  const { state } = req.body;
  await micService.changeMicState(roomId, parseInt(micNumber), state);
  res.status(httpStatus.OK).send({ success: true, message: 'Mic state updated' });
});

exports.getRoomMics = catchAsync(async (req, res) => {
  const { roomId } = req.params;
  const mics = await micService.getRoomMics(roomId);
  res.status(httpStatus.OK).send({ success: true, data: mics });
});

exports.addMicToRoom = catchAsync(async (req, res) => {
  await micService.addMicToRoom(req, res);
});

exports.deleteUserMics = catchAsync(async (req, res) => {
  const { roomId, userId } = req.params;
  const mics = await micService.deleteUserMics(roomId, userId);
  res.status(httpStatus.OK).send({ success: true, message: 'User mics deleted', data: mics });
});