const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const micValidation = require('../../validations/mic.validation');
const micController = require('../../controllers/mic.controller');
const { isRoomOwnerOrModerator, isParticipant } = require('../../middlewares/room.auth');

const router = express.Router({ mergeParams: true });

/**
 * @route PUT /api/v1/mic/:roomId/change-state/:micNumber
 * @desc Admin or moderator changes mic state
 */
router.put(
  '/:roomId/change-state/:micNumber',
  auth(),
  validate(micValidation.changeMicState),
  micController.changeMicState
);

/**
 * @route GET /api/v1/mic/:roomId/mics
 * @desc Get all mics for a room
 */
router.get(
  '/:roomId/mics',
  auth(),
  micController.getRoomMics
);

/**
 * @route POST /api/v1/mic/:roomId/add
 * @desc Add a new mic to the room
 */
router.post(
  '/:roomId/add',
  auth(),
  isParticipant,
  validate(micValidation.addMicToRoom),
  micController.addMicToRoom
);

/**
 * @route DELETE /api/v1/mic/:roomId/user/:userId
 * @desc Delete all mics assigned to a user in a room
 */
router.delete(
  '/:roomId/user/:userId',
  auth(),
  isParticipant,
  micController.deleteUserMics
);

module.exports = router;
