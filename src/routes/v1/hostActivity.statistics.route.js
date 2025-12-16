const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const hostActivityStatisticsController = require('../../controllers/hostActivity.statistics.controller');
const roomValidation = require('../../validations/room.validation');

const router = express.Router();

router.get(
  '/:roomId/host/:hostId/total-time',
  auth,
  validate(roomValidation.getRoom),
  hostActivityStatisticsController.getHostTotalTime
);
router.get(
  '/:roomId/host/:hostId/activity-history',
  auth,
  validate(roomValidation.getRoom),
  hostActivityStatisticsController.getHostActivityHistory
);

module.exports = router;
