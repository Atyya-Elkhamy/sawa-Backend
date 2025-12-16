const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { User, GameUser, Game } = require('../models');
const { Gift, GameGiftTransaction } = require('../models');
// const User = require('../models/user.model')

/**
 * Get available games for a user
 * @param {ObjectId} userId
 * @returns {Promise<Array>}
 */
// const getAvailableGames = async () => {
//   const games = await Game.find({ active: true });
//   if (!games) {
//     throw new Error('No games found');
//   }

//   return games;
// };

const getAvailableGames = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }
  if (!user.levelPoints || user.levelPoints <= 100000) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Not Found"
    );
  }
  const games = await Game.find({ active: true });
  if (!games || games.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, "No games found");
  }
  return games;
};

/**
 * Add a new game
 * @param {object} gameBody
 * @returns {Promise<Game>}
 */
const addGame = async (gameBody) => {
  const game = await Game.create(gameBody);
  return game;
};

/**
 * Edit a game
 * @param {ObjectId} gameId
 * @param {object} gameBody
 * @returns {Promise<Game>}
 */
const editGame = async (gameId, gameBody) => {
  const game = await Game.findById(gameId);
  if (!game) {
    throw new Error('Game not found');
  }

  Object.assign(game, gameBody);

  await game.save();
  return game;
};

const getGameById = async (gameId) => {
  const game = await Game.findById(gameId);
  if (!game) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Game not found', 'اللعبة غير موجودة');
  }
  return game;
};
/**
 * Get game-specific user data
 * @param {ObjectId} userId
 * @param {ObjectId} gameId
 * @returns {Promise<object>}
 */
const getGameUserData = async (userId) => {
  const user = await User.findById(userId).select('balance userId name avatar frame credits');
  if (!user) {
    throw new Error('User not found');
  }

  return user;
};

/**
 * Update user profit and ranking for a game
 * @param {ObjectId} userId
 * @param {ObjectId} gameId
 * @param {number} profit
 * @param {number} rank
 * @returns {Promise<GameUser>}
 */
const updateUserGameStats = async (userId, gameId, profit, rank) => {
  const gameUser = await GameUser.findOne({ user: userId });
  if (!gameUser) {
    throw new Error('Game user profile not found');
  }

  const gameData = gameUser.gameData.find((data) => data.game.equals(gameId));
  if (gameData) {
    gameData.totalProfit += profit;
    gameData.rank = rank;
  } else {
    gameUser.gameData.push({ game: gameId, totalProfit: profit, rank });
  }

  await gameUser.save();
  return gameUser;
};
const getUserGameBoxCredits = async (gameId) => {
  const game = await Game.findById(gameId).select('gameBoxCredits rateMultiplier id');
  if (!game) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Game not found', 'اللعبة غير موجودة');
  }
  return game;
};
// inc or dec credits
const increaseUserGameBoxCredits = async (gameId, credits) => {
  const game = await Game.findById(gameId).select('gameBoxCredits rateMultiplier');
  if (!game) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Game not found', 'اللعبة غير موجودة');
  }
  const multiply = 1 - game.rateMultiplier / 100;
  const addedCredits = Math.floor(credits * multiply);
  // check credits if it's negative
  if (addedCredits < 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Credits must be positive', 'الرصيد يجب ان يكون ايجابي');
  }
  game.gameBoxCredits += addedCredits;
  await game.save();

  return game;
};
const deductUserGameBoxCredits = async (gameId, credits) => {
  const game = await Game.findById(gameId).select('gameBoxCredits');
  if (credits > game.gameBoxCredits || game.gameBoxCredits <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient credits', 'الرصيد غير كافي');
  }
  if (!game) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Game not found', 'اللعبة غير موجودة');
  }
  game.gameBoxCredits -= Math.abs(credits);
  await game.save();
  return game;
};
const sendGiftByGame = async (gameId, recipientId, giftId, amount = 1, message = '') => {
  const gift = await Gift.findById(giftId).select('price name');
  if (!gift) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Gift not found', 'الهدية غير موجودة');
  }

  const recipient = await User.findById(recipientId);
  if (!recipient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Recipient not found', 'المستلم غير موجود');
  }

  // Increase recipient fame points
  recipient.famePoints += gift.price * amount;
  await recipient.save();

  const giftTransactions = [];
  for (let i = 0; i < amount; i += 1) {
    giftTransactions.push({
      gift: giftId,
      gameId,
      recipient: recipientId,
      price: gift.price,
      message,
    });
  }

  // Create a game gift transaction record
  const createdGiftTransactions = await GameGiftTransaction.insertMany(giftTransactions);

  return createdGiftTransactions;
};

const sendMultipleGiftsByGame = async (gameId, recipientId, gifts) => {
  const recipient = await User.findById(recipientId);
  if (!recipient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Recipient not found', 'المستلم غير موجود');
  }

  let totalFamePoints = 0;
  const giftTransactions = [];

  await Promise.all(
    gifts.map(async ({ giftId, amount = 1 }) => {
      const gift = await Gift.findById(giftId).select('price name');
      if (!gift) {
        throw new ApiError(httpStatus.NOT_FOUND, `Gift with ID ${giftId} not found`, 'الهدية غير موجودة');
      }

      // Increase fame points for each gift
      totalFamePoints += gift.price * amount;

      // Create multiple game gift transaction records based on the amount
      Array.from({ length: amount }).forEach(() => {
        giftTransactions.push({
          gift: giftId,
          gameId,
          recipient: recipientId,
          price: gift.price,
          message: '',
        });
      });
    })
  );

  // Update recipient fame points
  recipient.famePoints += totalFamePoints;
  await recipient.save();

  // Insert all gift transactions at once
  const createdGiftTransactions = await GameGiftTransaction.insertMany(giftTransactions);

  return createdGiftTransactions;
};

module.exports = {
  getAvailableGames,
  getGameUserData,
  updateUserGameStats,
  addGame,
  editGame,
  sendGiftByGame,
  getGameById,
  getUserGameBoxCredits,
  increaseUserGameBoxCredits,
  deductUserGameBoxCredits,
  sendMultipleGiftsByGame,
};
