const express = require('express');
const auth = require('../../middlewares/auth');
const { isRoomOwner } = require('../../middlewares/room.auth');
const validate = require('../../middlewares/validate');
const roomPostValidation = require('../../validations/roomPost.validation');
const roomPostController = require('../../controllers/room/roomPost.controller');

const router = express.Router();

// Create a broadcast
router.post('/', auth(), validate(roomPostValidation.createRoomPost), roomPostController.createRoomPost);
router.post(
  '/live-message/:roomId',
  auth(),
  validate(roomPostValidation.createLiveMessage),
  roomPostController.createLiveMessage
);

// Get broadcasts
router.get('/', auth(), roomPostController.getRoomPosts);

// Create a post

module.exports = router;
