const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const chatService = require('../services/chat/chat.service');
const ApiError = require('../utils/ApiError');
const userService = require('../services/user.service');
const logger = require('../config/logger');
const User = require('../models/user.model');
const { redisClient } = require('../config/redis');
const systemMessageService = require('../services/chat/systemMessages.service');
const strangerGiftService = require('../services/chat/strangerGifts.service');
const userRelationService = require('../services/user/user.relations.service');
const Sticker = require('../models/chat/sticker.model');
const { profileService } = require('../services');
const forbiddenWordsService = require('../services/forbiddenWords.service');
const chatCleanupService = require('../services/chat/chatCleanup.service');

// Send a message in an existing conversation
const sendMessage = catchAsync(async (req, res) => {
  const { text, stickerId } = req.body;
  const { conversationId } = req.params;
  logger.info(`User ${req.user.id} is sending a message to conversation ${conversationId}`);
  // Check access to the conversation
  const conversation = await chatService.checkAccessForConversation(conversationId, req.user.id);
  // Validate message content
  if (!text && !stickerId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Message cannot be empty', 'الرسالة لا يمكن أن تكون فارغة');
  }


  let messageType;
  let content;
  if (text) {
    messageType = 'text';
    const containsForbiddenWords = await forbiddenWordsService.containsForbiddenWords(text);
    if (containsForbiddenWords) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Message contains forbidden words', 'الرسالة تحتوي على كلمات محظورة');
    }

    content = { body: text };
  } else if (stickerId) {
    messageType = 'emoji';
    // Check access to the sticker
    const sticker = await chatService.checkStickerAccess(req.user.id, stickerId);
    if (!sticker) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'You do not have access to this sticker',
        'ليس لديك حق الوصول إلى هذا الملصق'
      );
    }
    content = { body: sticker.file, duration: sticker.duration };
  }

  const receiverId = conversation.participants.find((id) => id != req.user.id).toString();
  // Send message via the service
  const message = await chatService.sendMessage({
    conversationId,
    senderId: req.user.id,
    receiverId,
    messageType,
    content,
  });
  // Notify via Socket.io (if applicable)
  res.status(httpStatus.CREATED).json(message);
});

// Send media message
const sendMedia = catchAsync(async (req, res) => {
  const { type, audioDuration } = req.body;
  const { conversationId } = req.params;
  console.log('req.uploadedFileName', req.file);

  // Check access to the conversation
  const conversation = await chatService.checkAccessForConversation(conversationId, req.user.id);

  // Check if the media file is present
  if (!req.file) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'File is required', 'الملف مطلوب');
  }

  const content = {
    body: `${req.file.location}`,
  };
  if (type === 'voice') {
    content.duration = Number(audioDuration);
  }

  const receiverId = conversation.participants.find((id) => id != req.user.id).toString();
  // Send media message via the service
  const message = await chatService.sendMessage({
    conversationId,
    senderId: req.user.id,
    senderName: req.user.name,
    senderAvatar: req.user.avatar,
    receiverId,
    messageType: type,
    content,
  });
  // Notify via Socket.io (if applicable)
  res.status(httpStatus.CREATED).json(message);
});
// Fetch messages in a conversation
const getMessages = catchAsync(async (req, res) => {
  const { conversationId } = req.params;
  const { limit, page } = req.query;

  const conversation = await chatService.checkAccessForConversation(conversationId, req.user.id);

  // get deleted at date for the user
  const deletedAt = conversation.deletedAt?.get(req.user.id) || null;

  const messages = await chatService.fetchMessages(conversationId, req.user.id, deletedAt, {
    limit: Number(limit) || 20,
    page: Number(page) || 1,
  });
  // send on first fetch
  if (page == '1') {
    const targetUserId = conversation.participants.find((id) => id != req.user.id).toString();
    const { isSecure } = conversation;
    console.log('targetUserId', targetUserId);

    const isBlocked = await userService.isBlocked(req.user.id, targetUserId);
    const areFriends = await userService.isFriend(req.user.id, targetUserId);
    const targetUser = await userService.getProjectedUserById(targetUserId);
    const background = conversation.getBackground(req.user.id);
    console.log('areFriends', areFriends);

    res.status(httpStatus.OK).json({ messages, areFriends, isBlocked, targetUser, isSecure, background });
    return;
  }
  res.status(httpStatus.OK).json({ messages });
});

const getConversationImages = catchAsync(async (req, res) => {
  const { conversationId } = req.params;
  const conversation = await chatService.checkAccessForConversation(conversationId, req.user.id);
  const deletedAt = conversation.deletedAt?.get(req.user.id) || null;
  const images = await chatService.getConversationImages(conversationId, deletedAt);
  if (!images) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No images found', 'لم يتم العثور على صور');
  }
  res.status(httpStatus.OK).json(images);
});

// Start a new conversation
const startConversation = catchAsync(async (req, res) => {
  const { receiverId } = req.body;
  const userId = req.user.id;

  // check if the conversation already exists
  const existingConversation = await chatService.getConversationByUsers(userId, receiverId);
  if (existingConversation) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Conversation already exists', 'المحادثة موجودة بالفعل');
  }

  // Start a conversation via the service
  const message = await chatService.startConversation({
    senderId: req.user.id,
    receiverId,
  });

  res.status(httpStatus.CREATED).json(message);
});

// Get all conversations for the logged-in user
const getAllConversations = catchAsync(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const conversations = await chatService.getAllConversations(req.user.id, Number(page), Number(limit));
  res.json(conversations);
});

// Get unread conversations count for the logged-in user
const getUnreadConversations = catchAsync(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const conversations = await chatService.getUnreadConversationsCount(req.user.id, Number(page), Number(limit));
  res.json(conversations);
});

// Get total unread messages count for the logged-in user
const getTotalUnreadMessages = catchAsync(async (req, res) => {
  const totalUnreadMessages = await chatService.getTotalUnreadMessagesCount(req.user.id);
  res.json({ totalUnreadMessages });
});

const isOnline = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const socketId = await redisClient.hGet('connectedUsers', userId);
  if (socketId) {
    res.json({ isOnline: true });
  }
  const user = await User.findById(userId).select('isOnline lastSeen');
  console.log(user);
  res.json({ isOnline: user.isOnline, lastSeen: user.lastSeen });
});
/// system messages
const getUnreadSystemMessagesCount = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;

    const systemCount = await systemMessageService.getUnreadSystemMessagesCount(userId);
    const giftsCount = await strangerGiftService.getUnreadStrangerGiftsCount(userId);
    const followersCount = await userRelationService.countUnReadFollowers(userId);
    // get profile visits count
    const profileVisitsCount = await profileService.getUnreadProfileVisitorsCount(userId);
    res.status(200).json({ systemCount, giftsCount, followersCount, profileVisitsCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const getSystemMessagesByUser = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;
    const { page, limit } = req.query;
    logger.info(`Getting system messages for user ${userId}`);
    const messages = await systemMessageService.getSystemMessagesByUser(userId, Number(page), Number(limit));
    res.status(200).json({ messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
/// system messages
const getUnreadStrangerGiftsCount = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await strangerGiftService.getUnreadStrangerGiftsCount(userId);
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const getStrangerGiftsByUser = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;
    logger.info(`Getting system messages for user ${userId}`);
    const strangerGifts = await strangerGiftService.getStrangerGiftsByUser(userId);
    res.status(200).json({ strangerGifts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const sendSystemMessage = catchAsync(async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    const message = await systemMessageService.addSystemMessage(receiverId, content);
    res.status(201).json({ message });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const getConversationByUserId = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const conversation = await chatService.getConversationByUsers(req.user.id, userId);

  const areFriends = await userService.isFriend(req.user.id, userId);
  const isBlocked = await userService.isBlocked(req.user.id, userId);
  const targetUser = await userService.getProjectedUserById(userId);

  if (conversation) {
    const deletedAt = conversation.deletedAt?.get(req.user.id) || null;
    const messages = await chatService.fetchMessages(conversation._id, req.user.id, deletedAt, {
      limit: 20,
      page: 1,
    });

    res.status(200).json({
      conversationId: conversation._id,
      messages,
      areFriends,
      isBlocked,
      targetUser,
      isSecure: conversation.isSecure,
      background: conversation.getBackground(req.user.id),
    });
    return;
  }

  // check if friends
  // start a new conversation with the message body
  const startConversationData = {
    senderId: req.user.id,
    receiverId: userId,
    areFriends,
  };

  const newConversation = await chatService.startConversation(startConversationData);
  res.status(httpStatus.CREATED).send({
    conversationId: newConversation._id,
    messages: { list: [], total: 0, totalPages: 0, page: 1, limit: 20, nextPage: null },
    areFriends,
    isBlocked,
    targetUser,
    isSecure: false,
    background: null,
  });
});

const getStickers = catchAsync(async (req, res) => {
  // grouped by category
  const stickers = await Sticker.find().select('name image category type file duration').sort({ category: -1 });

  /**
   * [
   *  {
   *   category: 'category1',
   *    stickers: [
   *     { sticker1 },
   *    { sticker2 }
   *   ]
   * }
   * ]
   */
  const categories = stickers.reduce((acc, sticker) => {
    const category = acc.find((c) => c.category === sticker.category);
    if (category) {
      category.stickers.push(sticker);
    } else {
      acc.push({ category: sticker.category, stickers: [sticker] });
    }
    return acc;
  }, []);
  res.json(categories);
});

const deleteChatMessageBySender = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { messageId } = req.params;
  const message = await chatService.deleteChatMessage(messageId, userId);
  res.json(message);
});

const deleteConversationByUser = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { conversationId, selfDelete } = req.body;
  const conversation = await chatService.deleteConversation(conversationId, userId, selfDelete);
  res.json(conversation);
});

const toggleConversationSecure = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { conversationId } = req.body;
  const conversation = await chatService.toggleConversationSecure(conversationId, userId);
  res.json(conversation);
});

const setBackground = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { conversationId } = req.params;

  // get backgroundUrl from req.file
  const backgroundUrl = req.file.location;
  // Check access to the conversation

  await chatService.setConversationBackground(conversationId, userId, backgroundUrl);

  res.status(httpStatus.OK).send({
    message: 'Background set successfully',
    messageAr: 'تم تعيين الخلفية بنجاح',
    backgroundUrl,
  });
});

const deleteBackground = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { conversationId } = req.params;

  // Check access to the conversation
  await chatService.setConversationBackground(conversationId, userId, null);
  res.status(httpStatus.OK).send({
    message: 'Background deleted successfully',
    messageAr: 'تم حذف الخلفية بنجاح',
  });
});

// Admin endpoint to get cleanup statistics
const getCleanupStatistics = catchAsync(async (req, res) => {
  const stats = await chatCleanupService.getCleanupStatistics();
  res.status(httpStatus.OK).send({
    message: 'Cleanup statistics retrieved successfully',
    messageAr: 'تم جلب إحصائيات التنظيف بنجاح',
    data: stats,
  });
});

// Admin endpoint to manually trigger cleanup
const triggerCleanup = catchAsync(async (req, res) => {
  const result = await chatCleanupService.cleanupOldChatMessages();
  res.status(httpStatus.OK).send({
    message: 'Cleanup completed successfully',
    messageAr: 'تم إكمال التنظيف بنجاح',
    data: result,
  });
});

module.exports = {
  sendMessage,
  sendMedia,
  getMessages,
  startConversation,
  getAllConversations,
  getUnreadConversations,
  getTotalUnreadMessages,
  isOnline,
  getUnreadSystemMessagesCount,
  getSystemMessagesByUser,
  sendSystemMessage,
  getUnreadStrangerGiftsCount,
  getStrangerGiftsByUser,
  getConversationByUserId,
  getStickers,
  getConversationImages,
  deleteChatMessageBySender,
  deleteConversationByUser,
  toggleConversationSecure,
  setBackground,
  deleteBackground,
  getCleanupStatistics,
  triggerCleanup,
};
