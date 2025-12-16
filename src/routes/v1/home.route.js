// routes/game.route.js
const express = require('express');
const validate = require('../../middlewares/validate');
const LeaderboardController = require('../../controllers/leaderboard.controller');
const settingsController = require('../../controllers/settings.controller');
const gameController = require('../../controllers/game.controller');
const authController = require('../../controllers/auth.controller');
const roomController = require('../../controllers/room/room.controller');
const parsePaginationParams = require('../../middlewares/parsePaginationParams');
const auth = require('../../middlewares/auth');

const router = express.Router();

// Use API key validation middleware for all game routes

// Define game routes
router.get('/activities', settingsController.getActivities);
router.get('/activities/:activityId', settingsController.getActivityById);
router.get('/available-games', auth(), gameController.getAvailableGames);
router.get('/daily-login', auth(), authController.dailyLogin);
router.get('/leaderboard', parsePaginationParams, auth(), LeaderboardController.getHistoricalLeaderboard);
router.get('/leaderboard/user', parsePaginationParams, auth(), LeaderboardController.getUserRank);
router.get('/leaderboard/top', parsePaginationParams, auth(), LeaderboardController.getTopUsers);
router.get('/rooms/trending', parsePaginationParams, auth(), roomController.getTrendingRooms);
router.get('/rooms/new', parsePaginationParams, auth(), roomController.getNewRooms);
router.get('/rooms/followed', parsePaginationParams, auth(), roomController.getMyFollowedRooms);
router.get('/rooms/games', parsePaginationParams, auth(), roomController.getGameRooms);
module.exports = router;
