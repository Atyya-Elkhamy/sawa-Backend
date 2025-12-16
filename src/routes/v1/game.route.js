// routes/game.route.js
const express = require('express');
const validateApiKey = require('../../middlewares/validateApiKey');
const gameController = require('../../controllers/game.controller');
const gameValidation = require('../../validations/game.validation');
const validate = require('../../middlewares/validate');
const parsePaginationParams = require('../../middlewares/parsePaginationParams');
const giftController = require('../../controllers/gift.controller');
const storeValidation = require('../../validations/store.validation');
const upload = require('../../middlewares/upload');

const router = express.Router();

// Use API key validation middleware for all game routes
router.use(validateApiKey);

// Define game routes
router.get('/available-games/', gameController.getAvailableGames);
// router.post('/user-data', gameController.getGameUserData);
router.post('/send-gift', validate(gameValidation.sendGift), gameController.sendGiftByGame);
// multuble gifts
router.post('/send-multiple-gifts', validate(gameValidation.sendMultipleGifts), gameController.sendMultipleGiftsByGame);
// router.post('/update-game-stats', gameController.updateUserGameStats);
router.get('/user-rank', gameController.getGameUserRank);
router.get('/user-data', gameController.getGameUserData);

// Route to get the global leaderboard for a game
router.get('/leaderBoard/global', validate(gameValidation.getLeaderBoard), gameController.getGlobalLeaderBoard);

// Route to get the round-specific leaderboard for a game
router.get('/leaderBoard/round', validate(gameValidation.getLeaderBoard), gameController.getRoundLeaderBoard);

// router.post('/update-game-stats', gameController.updateUserGameStats);
router.get('/get-game-data', gameController.getGameDate);
router.get(
  '/profit-history/:userId',
  validate(gameValidation.getUserProfitHistory),
  parsePaginationParams,
  gameController.getUserProfitHistory
);

router.put('/update-game-data', gameController.updateGameDate);
router.get('/game/gifts', gameController.getGameGifts);
router.post('/user/add-credits', validate(gameValidation.increaseUserBalance), gameController.increaseUserBalance);
router.post('/pay', validate(gameValidation.deductUserBalance), gameController.deductUserBalance);
router.post('/game-box/add-credits', gameController.addUserGameBoxCredits);
router.post('/game-box/deduct-credits', gameController.deductUserGameBoxCredits);
router.get('/game-box/credits', gameController.getUserGameBoxCredits);
router.post(
  '/admin/gift/create',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'file', maxCount: 1 },
  ]),
  validate(storeValidation.createGift),
  giftController.createGift
);
router.post(
  '/admin/gift/edit/:giftId',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'file', maxCount: 1 },
  ]),
  validate(storeValidation.createGift),
  giftController.editGift
);

// add a store item to the user's bagف
router.post(
  '/add-store-item-to-user-bag',
  validate(gameValidation.addStoreItemToUserBag),
  gameController.addStoreItemToUserBag
);

router.get('/payment-history/:userId', gameController.getUserPaymentHistory);

router.post('/set-room-game', validate(gameValidation.setRoomGame), gameController.setRoomGame);
module.exports = router;
