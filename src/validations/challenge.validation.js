const Joi = require('joi');

const createChallenge = {
  body: Joi.object().keys({
    roomId: Joi.string().required(),
    prizeAmount: Joi.number().required(),
    choice: Joi.string().valid('rock', 'paper', 'scissors').required(),
  }),
};

const acceptChallenge = {
  params: Joi.object().keys({
    challengeId: Joi.string().required(),
  }),
  body: Joi.object().keys({
    choice: Joi.string().valid('rock', 'paper', 'scissors').required(),
  }),
};

module.exports = {
  createChallenge,
  acceptChallenge,
};
