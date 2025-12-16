// controllers/game.controller.js
const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const gameService = require('../services/game.service');
const userService = require('../services/user.service');
const { GameGiftTransaction, Game } = require('../models');
const ApiError = require('../utils/ApiError');
const ApiKey = require('../models/games/game.apiKey.model');
const GameUserTransaction = require('../models/games/game.user.transaction.model');
const { storeService } = require('../services');
const roomService = require('../services/room/room.service');

/**
 * Get available games for a user
 */
const getAvailableGames = catchAsync(async (req, res) => {
  const games = await gameService.getAvailableGames(req.user.id);
  res.send(games);
});

const updateGameDate = catchAsync(async (req, res) => {
  const { gameId } = req;
  const game = await gameService.editGame(gameId, req.body);
  res.send(game);
});

/**
 * add a new game
 */
const addGame = catchAsync(async (req, res) => {
  const game = await gameService.addGame(req.body);
  res.send(game);
});

/**
 * edit a game
 */
const editGame = catchAsync(async (req, res) => {
  const game = await gameService.editGame(req.params.gameId, req.body);
  res.send(game);
});

/**
 * Get game-specific user data
 */
const getGameUserData = catchAsync(async (req, res) => {
  const { userId } = req.query;
  const user = await gameService.getGameUserData(userId);
  res.send(user);
});
const getGameUserRank = catchAsync(async (req, res) => {
  const { userId } = req.query;
  const { gameId } = req;

  const gameUserData = await GameGiftTransaction.getUserRank(gameId, userId);

  res.send(gameUserData);
});
const getGameDate = catchAsync(async (req, res) => {
  const { gameId } = req;
  if (!gameId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'gameId is required', 'رقم اللعبة مطلوب');
  }
  const game = await gameService.getGameById(gameId);
  res.send(game);
});

const deductUserBalance = catchAsync(async (req, res) => {
  const { userId, amount, description, descriptionAr } = req.body;
  const user = await userService.deductUserBalance(
    userId,
    amount,
    description || ' payment on game',
    descriptionAr || 'دفع على اللعبة'
  );
  gameService.increaseUserGameBoxCredits(req.gameId, amount);

  GameUserTransaction.create({
    user: userId,
    game: req.gameId,
    transactionType: 'debit',
    amount,
    description: description || ' payment on game',
    descriptionAr: descriptionAr || 'دفع على اللعبة',
  });

  res.status(httpStatus.OK).send({
    balance: user.balance,
    success: true,
    message: 'Balance deducted successfully',
    messageAr: 'تم خصم الرصيد بنجاح',
  });
});

const increaseUserBalance = catchAsync(async (req, res) => {
  const { userId, amount, description, descriptionAr } = req.body;
  const { gameId } = req;
  await gameService.deductUserGameBoxCredits(gameId, amount);
  const user = await userService.increaseUserBalance(
    userId,
    amount,
    description || ' received from game',
    descriptionAr || 'تم استلامه من اللعبة'
  );
  GameGiftTransaction.create({
    recipient: userId,
    price: amount,
    gameId,
  });
  res.status(httpStatus.OK).send({
    balance: user.balance,
    success: true,
    message: 'Balance increased successfully',
    messageAr: 'تم زيادة الرصيد بنجاح',
  });
});

/**
 * Update user profit and ranking for a game
 */
const updateUserGameStats = catchAsync(async (req, res) => {
  const { userId, gameId, profit, rank } = req.body;
  const updatedGameUser = await gameService.updateUserGameStats(userId, gameId, profit, rank);
  res.send(updatedGameUser);
});

const sendGiftByGame = catchAsync(async (req, res) => {
  const { recipientId, giftId, amount } = req.body;
  const { gameId } = req;
  const giftTransaction = await gameService.sendGiftByGame(gameId, recipientId, giftId, amount);
  res.status(httpStatus.CREATED).send(giftTransaction);
});
const sendMultipleGiftsByGame = catchAsync(async (req, res) => {
  const { recipientId, gifts } = req.body; // Expecting an array of gifts
  const { gameId } = req;
  const giftTransactions = await gameService.sendMultipleGiftsByGame(gameId, recipientId, gifts);
  res.status(httpStatus.CREATED).send(giftTransactions);
});

// Get leaderboard
const getGlobalLeaderBoard = catchAsync(async (req, res) => {
  const { gameId } = req;
  const leaderBoard = await GameGiftTransaction.getGlobalLeaderBoard(gameId);
  res.send(leaderBoard);
});

/**
 * Get round-specific leaderboard for a game
 */
const getRoundLeaderBoard = catchAsync(async (req, res) => {
  const { gameId } = req;
  const leaderBoard = await GameGiftTransaction.getRoundLeaderBoard(gameId);
  res.send(leaderBoard);
});

const generateApiKey = catchAsync(async (req, res) => {
  const { gameId } = req.body;

  const game = await Game.findById(gameId);
  if (!game) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Game not found', 'اللعبة غير موجودة');
  }

  const apiKey = await ApiKey.generateKey(gameId);
  res.status(httpStatus.CREATED).send(apiKey);
});

/**
 * Deactivate an API key
 */
const deactivateApiKey = catchAsync(async (req, res) => {
  const { key } = req.body;

  const apiKey = await ApiKey.findOne({ key });
  if (!apiKey) {
    throw new ApiError(httpStatus.NOT_FOUND, 'API key not found', 'مفتاح API غير موجود');
  }

  apiKey.active = false;
  await apiKey.save();

  res.status(httpStatus.OK).send({ message: 'API key deactivated', messageAr: 'تم إلغاء تنشيط مفتاح API' });
});
const getUserProfitHistory = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { page, limit } = req.query;
  const { gameId } = req;
  const history = await GameGiftTransaction.getUserProfitHistory(
    userId,
    gameId,
    parseInt(page || 1, 10),
    parseInt(limit || 10, 10)
  );
  if (!history) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User profit history not found', 'تاريخ ربح المستخدم غير موجود');
  }

  res.status(httpStatus.OK).send(history);
});

const getGameGifts = catchAsync(async (req, res) => {
  const game = await Game.findById(req.gameId).populate('gifts storeItems', ' name image _id price gameMultiplier');
  // add a type on each gift / store item

  res.send({
    gifts: game.gifts.map((gift) => {
      return {
        ...gift.toObject(),
        type: 'gift',
      };
    }),
    storeItems: game.storeItems.map((storeItem) => {
      return {
        ...storeItem.toObject(),
        type: 'storeItem',
      };
    }),
  });
});
// get game box credits
const getUserGameBoxCredits = catchAsync(async (req, res) => {
  const { gameId } = req;

  const gameUser = await gameService.getUserGameBoxCredits(gameId);
  res.send(gameUser);
});
const addUserGameBoxCredits = catchAsync(async (req, res) => {
  const { gameId } = req;
  const { credits } = req.body;
  const gameUser = await gameService.increaseUserGameBoxCredits(gameId, credits);
  res.send(gameUser);
});
// dec
const deductUserGameBoxCredits = catchAsync(async (req, res) => {
  const { gameId } = req;
  const { credits } = req.body;
  const gameUser = await gameService.deductUserGameBoxCredits(gameId, credits);
  res.send(gameUser);
});

const getUserPaymentHistory = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { page, limit } = req.query;
  const { gameId } = req;
  const history = await GameUserTransaction.getUserPaymentHistory(
    userId,
    gameId,
    parseInt(page || 1, 10),
    parseInt(limit || 10, 10)
  );
  if (!history) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User payment history not found', 'تاريخ دفع المستخدم غير موجود');
  }

  res.status(httpStatus.OK).send(history);
});

const addStoreItemToUserBag = catchAsync(async (req, res) => {
  const { userId, itemId, durationOption } = req.body;
  let duration = 0;
  switch (durationOption) {
    case 7:
      duration = 7;
      break;
    case 15:
      duration = 15;
      break;
    case 30:
      duration = 30;
      break;
    default:
      duration = 7;
      break;
  }

  await storeService.addProductToBoughtItems(userId, itemId, duration);
  res.status(httpStatus.CREATED).json({
    message: 'Item added to bag successfully',
    messageAr: 'تمت إضافة العنصر إلى الحقيبة بنجاح',
    itemId,
  });
});

const setRoomGame = catchAsync(async (req, res) => {
  const { roomId, gameRoomId } = req.body;
  const { gameId } = req;
  if (!roomId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Room ID is required', 'رقم الغرفة مطلوب');
  }
  await roomService.setRoomGame(roomId, gameId, gameRoomId);
  res.status(httpStatus.OK).send({
    message: 'Room game set successfully',
    messageAr: 'تم تعيين لعبة الغرفة بنجاح',
  });
});

module.exports = {
  getAvailableGames,
  getGameUserData,
  updateUserGameStats,
  addGame,
  editGame,
  sendGiftByGame,
  getGlobalLeaderBoard,
  getRoundLeaderBoard,
  generateApiKey,
  deactivateApiKey,
  getUserProfitHistory,
  deductUserBalance,
  increaseUserBalance,
  getGameDate,
  getGameUserRank,
  updateGameDate,
  getGameGifts,
  deductUserGameBoxCredits,
  addUserGameBoxCredits,
  getUserGameBoxCredits,
  getUserPaymentHistory,
  sendMultipleGiftsByGame,
  addStoreItemToUserBag,
  setRoomGame,
};
