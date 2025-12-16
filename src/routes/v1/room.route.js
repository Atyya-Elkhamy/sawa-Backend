const { WebhookReceiver } = require('livekit-server-sdk');
const express = require('express');
const hostActivityController = require('../../controllers/hostActivity.controller');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const roomValidation = require('../../validations/room.validation');
const roomController = require('../../controllers/room/room.controller');
const roomParticipantsController = require('../../controllers/room/room.participants.controller');
const upload = require('../../middlewares/upload');
const { receiveWebhook, isRoomOwner, isRoomOwnerOrModerator, isParticipant } = require('../../middlewares/room.auth');
const roomItemsController = require('../../controllers/room/room.items.controller');
const pkController = require('../../controllers/room/room-pk.controller');
const router = express.Router();


router.post('/live-hooks', express.raw({ type: 'application/webhook+json' }), receiveWebhook, roomController.receiveWebhook);
router.get('/types', roomItemsController.getRoomTypes);
router.post('/create', auth(), upload.single('image'), validate(roomValidation.createRoom), roomController.createRoom);
router.get('/:roomId', auth(), validate(roomValidation.getRoom), roomController.getRoom);
router.put(
  '/:roomId/edit-data',
  auth(),
  isRoomOwner,
  upload.single('image'),
  validate(roomValidation.updateRoomSettings),
  roomController.updateRoomSettings
);
router.get('/:roomId/leaderboard', auth(), validate(roomValidation.leaderboard), roomController.getLeaderboard);
// set password
router.put(
  '/:roomId/settings/set-password',
  auth(),
  isRoomOwner,
  validate(roomValidation.setRoomPassword),
  roomController.setRoomPassword
);
router.post(
  '/:roomId/set-game',
  auth(),
  isRoomOwnerOrModerator,
  validate(roomValidation.setRoomGame),
  roomController.setRoomGame
);
// delete room
// router.delete('/:roomId', auth(), validate(roomValidation.deleteRoom), roomController.deleteRoom);

/**
 * manage items
 * select background image
 * select mic shape
 * upload background image
 * get room assets
 */

router.post(
  '/:roomId/items/select-item',
  auth(),
  isRoomOwner,
  upload.single('image'),
  validate(roomValidation.selectItem),
  roomItemsController.selectItem
);

router.get('/:roomId/items/get-assets', auth(), roomItemsController.getRoomAssets);

router.post(
  '/:roomId/type/purchase',
  auth(),
  isRoomOwner,
  validate(roomValidation.purchaseRoomType),
  roomItemsController.purchaseOrSelectRoomType
);

router.post(
  '/:roomId/items/upload-background-image',
  auth(),
  isRoomOwner,
  upload.single('image'),
  validate(roomValidation.uploadBackgroundImage),
  roomItemsController.uploadBackgroundImage
);

router.post(
  '/:roomId/join',
  auth(),
  validate(roomValidation.manageParticipants),
  roomParticipantsController.participantJoin
);
router.post(
  '/:roomId/leave',
  auth(),
  validate(roomValidation.manageParticipants),
  roomParticipantsController.participantLeave
);

/**
 * Manage Moderators
 * manage moderators
 * Get Moderators
 */
// Add Moderator
router.post(
  '/:roomId/moderators',
  auth(),
  isRoomOwner,
  validate(roomValidation.manageModerator),
  roomController.manageModerator
);

// Get Moderators
router.get('/:roomId/moderators', auth(), validate(roomValidation.getRoom), roomController.getModerators);

/**
 * special mics
 * Purchase special mic
 * Activate special mic
 * Deactivate special mic
 * Get special mics
 *
 */
router.post(
  '/:roomId/special-mics/purchase',
  auth(),
  isRoomOwner,
  validate(roomValidation.purchaseSpecialMic),
  roomItemsController.purchaseSpecialMic
);
router.post(
  '/:roomId/special-mics/toggle',
  auth(),
  isRoomOwner,
  validate(roomValidation.activateSpecialMic),
  roomItemsController.toggleSpecialMic
);

router.get('/:roomId/special-mics', auth(), isRoomOwner, roomItemsController.getSpecialMics);

/**
 * change room state
 */
router.put(
  '/:roomId/edit-current-state',
  auth(),
  validate(roomValidation.updateCurrentState),
  isRoomOwnerOrModerator,
  roomController.updateCurrentState
);

/**
 * manage participants
 * hop on mic
 * hop off mic
 * change mic state
 */

router.post(
  '/:roomId/participants/hop-on-mic/:micNumber',
  auth(),
  isParticipant,
  validate(roomValidation.hopOnMic),
  roomParticipantsController.hopOnMic
);
router.post(
  '/:roomId/participants/hop-off-mic',
  auth(),
  isParticipant,
  validate(roomValidation.hopOffMic),
  roomParticipantsController.hopOffMic
);
router.put(
  '/:roomId/admin/change-mic-state',
  auth(),
  isRoomOwnerOrModerator,
  validate(roomValidation.changeMicState),
  roomParticipantsController.changeMicState
);
// router.post('/:roomId/admin/join-game', auth(), isRoomOwner, validate(roomValidation.joinGame), roomController.joinGame);

/**
 * show room participants
 */
router.get('/:roomId/participants', auth(), roomParticipantsController.getRoomParticipants);
/**
 * invite user to room
 */
router.post('/:roomId/invite', auth(), validate(roomValidation.inviteUserToRoom), roomController.inviteUserToRoom);

/**
 * block user from the room
 * unblock user from the room
 * get blocked users
 */
router.post(
  '/:roomId/block',
  auth(),
  isRoomOwnerOrModerator,
  validate(roomValidation.blockUser),
  roomParticipantsController.blockUser
);
router.post(
  '/:roomId/unblock',
  auth(),
  isRoomOwnerOrModerator,
  validate(roomValidation.unblockUser),
  roomParticipantsController.unblockUser
);
router.get(
  '/:roomId/blocked-users',
  auth(),
  isRoomOwnerOrModerator,
  validate(roomValidation.getBlockedUsers),
  roomParticipantsController.getBlockedUsers
);

/**
 * Reserve mic temporarily to prevent concurrent access
 */
router.post(
  '/:roomId/reserve-mic/:micNumber',
  auth(),
  validate(roomValidation.reserveMic),
  roomParticipantsController.reserveMic
);

router.post(
  '/:roomId/pk/create',
  auth(),
  isRoomOwnerOrModerator,
  validate(roomValidation.createPk),
  pkController.createPkBattle
);

/**
 * Get PK battle info
 */
router.get(
  '/:roomId/pk',
  auth(),
  // isParticipant,
  pkController.getPkBattle
);

/**
 * Add PK team member
 */
router.post(
  '/:roomId/pk/add-member',
  auth(),
  validate(roomValidation.addTeamMember),
  // isParticipant,
  pkController.addTeamMember
);

/**
 * Update PK (points, mvp, state)
 */
router.put(
  '/:roomId/pk/update',
  auth(),
  validate(roomValidation.updatePk),
  // isRoomOwnerOrModerator,
  pkController.updatePkBattle
);

/**
 * Reset PK
 */
router.post(
  '/:roomId/pk/reset',
  auth(),
  // isRoomOwnerOrModerator,
  pkController.resetPkBattle
);

router.post('/:roomId/create-ingress', auth(), isRoomOwnerOrModerator, roomParticipantsController.createIngress);
module.exports = router;
