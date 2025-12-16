const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const challengeValidation = require('../../validations/challenge.validation');
const challengeController = require('../../controllers/challenge.controller');

const router = express.Router();

router.route('/').post(auth(), validate(challengeValidation.createChallenge), challengeController.createChallenge);

router
  .route('/:challengeId/accept')
  .post(auth(), validate(challengeValidation.acceptChallenge), challengeController.acceptChallenge);

module.exports = router;
