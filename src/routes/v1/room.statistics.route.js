const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const roomStatisticsController = require('../../controllers/room/room.statistics.controller');
const roomValidation = require('../../validations/room.validation');

const router = express.Router();

router.get(
  '/:roomId/active-participants',
  auth,
  validate(roomValidation.getRoom),
  roomStatisticsController.getActiveParticipants
);
router.get(
  '/:roomId/participant-history',
  auth,
  validate(roomValidation.getRoom),
  roomStatisticsController.getParticipantHistory
);

module.exports = router;
