// routes/game.route.js
const express = require('express');
const gameController = require('../../../controllers/game.controller');
const gameValidation = require('../../../validations/game.validation'); // Assuming this is your Joi validation setup or similar
const validate = require('../../../middlewares/validate'); // Correct validation middleware

const router = express.Router();

// Add a new game
router.post('/add', validate(gameValidation.addGame), gameController.addGame);

// Edit a game
router.put('/edit/:gameId', validate(gameValidation.editGame), gameController.editGame);

// Generate a new API key
router.post('/key/generate', validate(gameValidation.generateApiKey), gameController.generateApiKey);

// Deactivate an API key
router.post('/key/deactivate', validate(gameValidation.deactivateApiKey), gameController.deactivateApiKey);

module.exports = router;
