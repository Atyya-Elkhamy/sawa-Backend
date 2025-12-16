// middlewares/apiKeyAuth.js
const httpStatus = require('http-status');

const ApiError = require('../utils/ApiError');
const ApiKey = require('../models/games/game.apiKey.model');

const apiKeyAuth = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return next(new ApiError(httpStatus.UNAUTHORIZED, 'API key missing'));
  }

  try {
    const validKey = await ApiKey.validateKey(apiKey);
    req.gameId = validKey.game; // Set the game context for use in controllers
    next();
  } catch (error) {
    return next(new ApiError(httpStatus.UNAUTHORIZED, error.message));
  }
};

module.exports = apiKeyAuth;
