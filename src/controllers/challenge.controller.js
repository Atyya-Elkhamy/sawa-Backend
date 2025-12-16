const catchAsync = require('../utils/catchAsync');
const challengeService = require('../services/challenge.service');

const createChallenge = catchAsync(async (req, res) => {
  const { roomId, prizeAmount, choice } = req.body;
  const challenge = await challengeService.createChallenge(req.user.id, roomId, prizeAmount, choice);
  res.status(201).json(challenge);
});

const acceptChallenge = catchAsync(async (req, res) => {
  const { challengeId } = req.params;
  const { choice } = req.body;
  const challenge = await challengeService.acceptChallenge(challengeId, req.user.id, choice);
  res.json(challenge);
});

module.exports = {
  createChallenge,
  acceptChallenge,
};
