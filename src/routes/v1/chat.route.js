const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const chatController = require('../../controllers/chat.controller');
const chatValidation = require('../../validations/chat.validation');
const upload = require('../../middlewares/upload');

const router = express.Router();

// Send and get messages in a conversation
router
  .route('/messages/:conversationId')
  .post(auth(), validate(chatValidation.sendMessage), chatController.sendMessage)
  .get(auth(), chatController.getMessages);

// Send media (image/audio) in a conversation
router.post(
  '/messages/media/:conversationId',
  upload.single('file'), // Middleware to handle file uploads
  auth(),
  validate(chatValidation.sendMedia),
  chatController.sendMedia
);

router.get('/conversation-images/:conversationId', auth(), chatController.getConversationImages);

// Start a new conversation
router.post('/conversations/start', auth(), validate(chatValidation.startConversation), chatController.startConversation);
// get conversation by user
router.get('/get-conversation/:userId', auth(), chatController.getConversationByUserId);

// Get all conversations for the user
router.get('/conversations', auth(), chatController.getAllConversations);

// Get unread conversations for the user
router.get('/conversations/unread', auth(), chatController.getUnreadConversations);

// Get total unread messages for the user
router.get('/unread', auth(), chatController.getTotalUnreadMessages);

router.get('/isuseronline/:userId', auth(), chatController.isOnline);
// unread notifications Count --ALL
router.get('/system/unread-count/:userId', auth(), chatController.getUnreadSystemMessagesCount);
router.get('/system/messages', auth(), chatController.getSystemMessagesByUser);
router.get('/stranger-gifts/unread-count/:userId', auth(), chatController.getUnreadStrangerGiftsCount);
router.get('/stranger-gifts/', auth(), chatController.getStrangerGiftsByUser);
router.delete('/messages/:messageId', auth(), chatController.deleteChatMessageBySender);

router.post(
  '/conversations/delete-conversation',
  auth(),
  validate(chatValidation.deleteConversation),
  chatController.deleteConversationByUser
);
router.post(
  '/conversations/toggle-secure',
  auth(),
  validate(chatValidation.toggleConversationSecure),
  chatController.toggleConversationSecure
);

// set background image for conversation
router.post(
  '/conversations/:conversationId/background',
  auth(),
  upload.single('image'), // Middleware to handle file uploads
  chatController.setBackground
);

router.delete('/conversations/:conversationId/background', auth(), chatController.deleteBackground);

router.get('/stickers', auth(), chatController.getStickers);

// Admin routes for chat cleanup
router.get('/admin/cleanup/statistics', chatController.getCleanupStatistics);
router.post('/admin/cleanup/trigger', chatController.triggerCleanup);

module.exports = router;
