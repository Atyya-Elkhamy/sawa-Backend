const httpStatus = require('http-status');
const mongoose = require('mongoose');
const ApiError = require('../../utils/ApiError');
const ChatMessage = require('../../models/chat/chatMessage.model');
const Conversation = require('../../models/chat/conversation.model');
const { MESSAGE_TYPES, INVITATION_TYPES, deletedContent } = require('../../config/chat.config');
const userService = require('../user.service');
const logger = require('../../config/logger');
const StrangerGift = require('../../models/extra/strangerGift.model');
const { calculatePagination } = require('../../utils/pagination');
const Sticker = require('../../models/chat/sticker.model');
const { profileService } = require('..');
const messageSender = require('./messageSender');

// Send a message and update conversation metadata
const sendMessage = async (data, freeMessage = false) => {
  const { conversationId, senderId, receiverId, messageType, content } = data;
  const isBlocked = await userService.isBlocked(senderId, receiverId, true);
  if (isBlocked) {
    throw new ApiError(httpStatus.FORBIDDEN, 'there is A Block Between The Two Users', 'هناك حظر بينكما');
  }
  console.log('conversationId', conversationId);
  const areFriends = await userService.isFriend(senderId, receiverId);
  console.log('areFriends', areFriends);
  console.log('conversationId', conversationId);
  if (!areFriends && !freeMessage) {
    logger.info(`user ${senderId} is not friends with ${receiverId} we will store the message in a stranger collection`);
    // deduct 10 credits from the sender
    await userService.deductUserBalance(senderId, 300, 'message sent to a non friend', 'رسالة إلى شخص غير صديق');
  }

  // Create and save the new message
  const message = new ChatMessage({
    conversationId,
    senderId,
    receiverId,
    messageType,
    content,
  });

  logger.info(`Received new media message from ${senderId} to ${receiverId}`);
  // Send message via socket
  const sender = await userService.getProjectedUserById(senderId);
  const conversation = await Conversation.findById(conversationId);

  // Update conversation with last message and increment unread count for receiver
  const status = await messageSender.sendToUser(
    'newMessage',
    {
      ...(message?.toObject() || {}),
      senderId: senderId.toString(),
      conversationId: conversationId.toString(),
      senderName: sender.name,
      senderAvatar: sender.avatar,
      userData: sender,
      conversation: {
        _id: conversation._id,
        id: conversation._id,
        lastMessage: message?.toObject(),
        user: sender,
        isSecure: conversation.isSecure,
        unreadCount: conversation.unreadCount.get(receiverId),
      },
    },
    receiverId?.toString(),
    true
  );

  let increaseCount = 1;
  // Check if the receiver is currently in this conversation
  const isReceiverInConversation = await messageSender.isUserInConversation(receiverId?.toString(), conversationId);
  if (isReceiverInConversation) {
    // If they're actively viewing the conversation, set the message as read and don't increase unread count
    logger.info(`Receiver ${receiverId} is in conversation, not increasing unread count`);
    increaseCount = 0;
    message.isRead = true;
  } else {
    // User is online but not in this conversation, still mark as unread
    increaseCount = 1;
    message.isRead = false;
  }
  await message.save();

  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage: message._id,
    lastMessageAt: new Date(),
    $inc: { [`unreadCount.${receiverId}`]: increaseCount },
    hidden: {},
  });

  return message;
};

// Mark messages as read and reset unread count
const markMessagesAsRead = async (conversationId, userId) => {
  // Mark messages as read for the given user in the conversation
  const mes = await ChatMessage.updateMany(
    {
      conversationId,
      receiverId: userId,
      isRead: false,
    },
    { $set: { isRead: true } }
  );
  console.log('mesasdsd', mes);

  // Reset unread count for the user in the conversation
  await Conversation.findByIdAndUpdate(conversationId, {
    $set: { [`unreadCount.${userId}`]: 0 },
  });
};

// Fetch messages in a conversation with pagination
const fetchMessages = async (conversationId, userId, deletedAt, options = {}) => {
  console.log('deletedAt', deletedAt);
  const deletedAtDate = new Date(deletedAt) || new Date(0);
  console.log('deletedAtDate', deletedAtDate);
  const { limit = 20, page = 1 } = options;
  const messages = await ChatMessage.find({
    conversationId,
    createdAt: { $gt: deletedAtDate },
  })
    .select('content roomData createdAt isRead messageType senderId isDeleted')
    .populate('roomData', 'name roomType micShape currentState.hostMicEnabled image background isPrivate')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  // if message.roomData add it in the content
  messages.forEach((message) => {
    if (message.roomData) {
      message.content.roomData = message.roomData;
    }
  });

  // Mark messages as read once fetched
  markMessagesAsRead(conversationId, userId);

  const totalMessages = await ChatMessage.countDocuments({
    conversationId,
    createdAt: { $gt: deletedAtDate },
  });

  const pagination = calculatePagination(totalMessages, page, limit);

  return {
    list: messages,
    ...pagination,
  };
};

const checkAccessForConversation = async (conversationId, userId) => {
  const conversation = await Conversation.findById(conversationId).select(
    'participants deletedAt areFriends isSecure background'
  );
  if (!conversation) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Conversation not found', 'المحادثة غير موجودة');
  }
  if (!conversation.participants.includes(userId)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Access denied', 'غير مسموح');
  }
  return conversation;
};
const getConversationImages = async (conversationId, deletedAt) => {
  const deletedAtDate = new Date(deletedAt) || new Date(0);
  const messages = await ChatMessage.find({
    messageType: MESSAGE_TYPES.IMAGE,
    conversationId,
    createdAt: { $gt: deletedAtDate },
  })
    .select('content')
    .sort({ createdAt: -1 });
  console.log('messages', messages);
  return {
    list: messages.map((message) => message.content.body),
  };
};

// Get conversation by its ID
const getConversationById = async (conversationId) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Conversation not found', 'المحادثة غير موجودة');
  }
  return conversation;
};

// Start a new conversation between two users
const startConversation = async (data) => {
  const { senderId, receiverId, messageType, content, areFriends } = data;

  // Check if a conversation between these two users already exists
  let conversation = await Conversation.findOne({
    participants: { $all: [senderId, receiverId] },
  });

  if (conversation) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Conversation already exists', 'المحادثة موجودة بالفعل');
  }

  // Create a new conversation
  conversation = new Conversation({
    participants: [senderId, receiverId],
    unreadCount: {
      [receiverId]: 1, // Initialize unread count for the receiver
      [senderId]: 0, // Initialize unread count for the sender
    },
  });

  // Save an initial message indicating the conversation has started
  let message = null;
  if (content) {
    message = new ChatMessage({
      conversationId: conversation._id,
      senderId,
      receiverId,
      messageType: messageType || MESSAGE_TYPES.TEXT,
      content: content || { body: 'Conversation started' },
    });

    await message.save();

    // Update the conversation with the initial message and save
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();

    const sender = await userService.getProjectedUserById(senderId);

    // notify the receiver
    await messageSender.sendToUser(
      'newMessage',
      {
        ...message?.toObject(),
        senderId,
        conversationId: conversation._id,
        senderName: sender.name,
        senderAvatar: sender.avatar,
        userData: sender,
        conversation: {
          _id: conversation._id,
          id: conversation._id,
          lastMessage: message?.toObject(),
          user: sender,
          unreadCount: conversation.unreadCount.get(receiverId),
        },
      },
      receiverId?.toString(),
      true
    );
  } else {
    conversation.lastMessage = null;
  }

  const friends = areFriends || (await userService.isFriend(senderId, receiverId));
  if (friends) {
    conversation.areFriends = true;
  }
  await conversation.save();

  return conversation;
};

// Get count of unread messages for each conversation for a user
const getUnreadConversationsCount = async (userId, page, limit) => {
  const conversations = await Conversation.find({
    participants: userId,
    [`unreadCount.${userId}`]: { $gt: 0 },
    [`hidden.${userId}`]: { $ne: true },
    lastMessage: { $ne: null },
  })
    .populate([
      { path: 'lastMessage' },
      // pop the other user in the conversation
      {
        path: 'participants',
        select: '_id name userId avatar isOnline lastSeen',
      },
    ])
    .sort({ lastMessageAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const conversationCount = await Conversation.countDocuments({
    participants: userId,
    [`unreadCount.${userId}`]: { $gt: 0 },
  });

  const list = conversations.map((conversation) => {
    // Transform conversation to handle deleted users
    const transformedConversation = userService.transformDeletedUsers(conversation, 'participants');

    return {
      isSecure: transformedConversation.isSecure,
      conversationId: transformedConversation._id,
      lastMessage: transformedConversation.lastMessage,
      user: transformedConversation.participants.find((participant) => participant._id.toString() !== userId),
      unreadCount: transformedConversation.unreadCount.get(userId),
    };
  });
  const pagination = calculatePagination(conversationCount, page, limit);
  return {
    list,
    ...pagination,
  };
};

// Get all conversations for a user
const getAllConversations = async (userId, page, limit) => {
  const match = {
    participants: userId,
    [`hidden.${userId}`]: { $ne: true },
    lastMessage: { $ne: null },
  };
  const conversations = await Conversation.find(match)
    .populate([
      { path: 'lastMessage' },
      {
        path: 'participants',
        select: '_id name userId avatar isOnline lastSeen',
      },
    ])
    .sort({ lastMessageAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const conversationCount = await Conversation.countDocuments(match);

  const list = conversations.map((conversation) => {
    // Transform conversation to handle deleted users
    const transformedConversation = userService.transformDeletedUsers(conversation, 'participants');
    // 
    if (!transformedConversation.participants.find((participant) => participant._id.toString() !== userId)) {
      // skip
      return null;
    }

    return {
      isSecure: transformedConversation.isSecure,
      conversationId: transformedConversation._id,
      lastMessage: transformedConversation.lastMessage || {
        _id: "<MESSAGE_ID>",
        conversationId: transformedConversation._id,
        senderId: userId,
        receiverId: transformedConversation.participants.find((participant) => participant._id.toString() !== userId)._id || userId,
        messageType: 'text',
        content: {
          body: 'This message was deleted',
          bodyAr: 'تم حذف هذه الرسالة',
        },
        createdAt: Date.now(),
        isRead: true,
        updatedAt: Date.now(),
        __v: 0,
        id: "<Message_ID>",
        isDeleted: true
      },
      user: transformedConversation.participants.find((participant) => participant._id.toString() !== userId),
      unreadCount: transformedConversation.unreadCount.get(userId),
    };
  });
  // Remove null/undefined conversations
  const filteredList = list.filter((item) => item !== null);
  const pagination = calculatePagination(conversationCount, page, limit);
  return {
    list: filteredList,
    ...pagination,
  };
};

// Get the total count of unread messages for a user
const getTotalUnreadMessagesCount = async (userId) => {
  const count = await Conversation.aggregate([
    {
      $match: {
        participants: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $group: {
        _id: null,
        totalUnread: {
          $sum: { $toInt: `$unreadCount.${userId}` }, // Sum all unread counts for this user
        },
      },
    },
  ]);

  return count.length ? count[0].totalUnread : 0;
};

// Get a conversation between two specific users
const getConversationByUsers = async (senderId, receiverId) => {
  const conversation = await Conversation.findOne({
    participants: { $all: [senderId, receiverId] },
  }).populate('lastMessage');
  return conversation;
};

// Get a conversation ID between two specific users
const getConversationIdByUsers = async (senderId, receiverId) => {
  const conversation = await Conversation.findOne({ participants: { $all: [senderId, receiverId] } }).select('_id');
  return conversation ? conversation._id : null;
};

// send gift message to a user
const sendGiftMessage = async (
  userId,
  targetUserId,
  fromChat = false,
  gift = {
    giftId: '',
    body: '',
    amount: 1,
    senderName: '',
    senderAvatar: '',
    giftImage: '',
  }
) => {
  if (userId === targetUserId) {
    return;
  }
  console.log('chat.service.js');
  console.log('gift', gift);
  if (!gift) {
    logger.error('gift data is required to send a gift message');
    return;
  }
  if (!userId || !targetUserId) {
    logger.error('senderId and receiverId are required to send a gift message');
    return;
  }

  const areFriends = await userService.isFriend(userId, targetUserId);

  if (!areFriends) {
    // checking if friends
    logger.info(`user ${userId} is not friends with ${targetUserId} we will store the gift in a stranger collection`);
    // return;
    const strangerGiftData = {
      gift: gift.giftId,
      senderId: userId,
      total: gift.amount || 1,
      receiverId: targetUserId,
    };
    console.log('strangerGiftData', strangerGiftData);
    // Atomic upsert: increment total for same sender/receiver/gift, mark unread, and bump updatedAt
    const g = await StrangerGift.findOneAndUpdate(
      {
        receiverId: targetUserId,
        senderId: userId,
        gift: gift.giftId,
      },
      {
        $inc: { total: gift.amount || 1 },
        $set: {
          isRead: false,
          date: new Date(),
          updatedAt: new Date(),
        },
        $setOnInsert: {
          // in case of new doc, default fields
          createdAt: new Date(),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    console.log('g', g);
    await messageSender.sendToUser(
      'strangerGiftReceived',
      {
        giftId: gift.giftId,
        giftImage: gift.image,
        senderId: userId,
        roomId: null,
        amount: gift.amount,
        senderName: gift.senderName,
        senderAvatar: gift.senderAvatar,
      },
      targetUserId?.toString(),
      true
    );
    return;
    // we will store in gift from a stranger collection
  }
  if (fromChat) {
    // start a new conversation with the message body

    // check if a conversation between the two users already exists
    const conversation = await getConversationByUsers(userId, targetUserId);

    if (!conversation) {
      logger.info(`starting a new conversation between ${userId} and ${targetUserId}`);
      console.log('gift', gift);
      const startConversationData = {
        senderId: userId,
        receiverId: targetUserId,
        messageType: MESSAGE_TYPES.GIFT,
        content: { body: gift.body, giftId: gift.giftId, amount: gift.amount },
        areFriends,
      };

      await startConversation(startConversationData);
      return;
    }
    // send the gift message
    const messageData = {
      conversationId: conversation,
      senderId: userId,
      receiverId: targetUserId,
      messageType: MESSAGE_TYPES.GIFT,
      content: { body: gift.body, giftId: gift.giftId, amount: gift.amount },
    };

    await sendMessage(messageData);
  }
};

const sendInvitationMessage = async (data) => {
  const { senderId, receiverId, invitation } = data;
  console.log('invitationType', invitation.invitationType);
  console.log('invitationId', invitation.invitationId);
  if (!senderId || !receiverId) {
    logger.error('senderId and receiverId are required to send a gift message');
    return;
  }
  const conversation = await getConversationIdByUsers(senderId, receiverId);
  logger.info(`conversation: ${conversation}`);

  if (!conversation) {
    // check if they are friends
    const areFriends = await userService.isFriend(senderId, receiverId);
    if (!areFriends) {
      logger.info(`user is not friends with ${receiverId} invitation message will not be sent`);
      return new ApiError(httpStatus.FORBIDDEN, 'User is not friends', 'المستخدم ليس صديق');
    }
    logger.info(`user sending gift message to ${receiverId} does not have a conversation with them`);
    const conversationData = {
      senderId,
      receiverId,
      messageType: MESSAGE_TYPES.INVITATION,
      content: {
        ...invitation,
      },
      areFriends,
    };
    await startConversation(conversationData);
    return;
  }

  const messageData = {
    conversationId: conversation,
    senderId,
    receiverId,
    messageType: MESSAGE_TYPES.INVITATION,
    content: {
      ...invitation,
    },
  };
  await sendMessage(messageData, true);
};

const deleteChatMessage = async (messageId, senderId) => {
  // check if the sender is the owner of the message
  const message = await ChatMessage.findById(messageId);
  if (!message) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Message not found', 'الرسالة غير موجودة');
  }
  // check if the sender is the owner of the message
  if (message.senderId != senderId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Access denied', 'غير مسموح');
  }
  // change the message content to deleted content
  message.messageType = MESSAGE_TYPES.TEXT;
  message.content = deletedContent;
  message.isDeleted = true;
  await message.save();
  // send io notification to the other user
  await messageSender.sendToUser(
    'messageDeleted',
    {
      messageId,
      conversationId: message.conversationId,
      senderId,
      content: deletedContent,
    },
    message.receiverId?.toString(),
    false
  );
  return message;
};

/**
 *
 * @param {string} userId
 * @param {string} stickerId
 * @returns {Promise<Sticker>}
 */

const checkStickerAccess = async (userId, stickerId) => {
  const sticker = await Sticker.findById(stickerId);

  if (!sticker) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Sticker not found', 'الملصق غير موجود');
  }
  if (sticker.type === 'free') {
    return sticker;
  }
  if (sticker.type === 'pro') {
    const pro = await profileService.isPro(userId);
    if (pro) {
      return sticker;
    }
  }
  if (sticker.type === 'vip') {
    const vip = await profileService.isVip(userId);
    if (vip) {
      return sticker;
    }
  }
  return false;
};

const deleteConversation = async (conversationId, userId, selfDelete = true) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Conversation not found', 'المحادثة غير موجودة');
  }
  if (!conversation.participants.includes(userId)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Access denied', 'غير مسموح');
  }
  // if deletedAt didnt exist we will create it
  if (!conversation.deletedAt) {
    conversation.deletedAt = new Map();
  }
  conversation.deletedAt?.set(userId, new Date());

  // set hidden
  if (!conversation.hidden) {
    conversation.hidden = new Map();
  }
  conversation.unreadCount?.set(userId, 0);
  conversation.hidden?.set(userId, true);
  if (!selfDelete) {
    const otherUser = conversation.participants.find((participant) => participant.toString() !== userId);
    conversation.deletedAt?.set(otherUser, new Date());
    conversation.hidden?.set(otherUser, true);
    conversation.unreadCount?.set(otherUser, 0);
  }
  await conversation.save();
};

const toggleConversationSecure = async (conversationId, userId) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Conversation not found', 'المحادثة غير موجودة');
  }
  if (!conversation.participants.includes(userId)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Access denied', 'غير مسموح');
  }

  // If conversation is currently secure, only the user who enabled it can disable it
  if (conversation.isSecure && conversation.secureEnabledBy && conversation.secureEnabledBy.toString() !== userId) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'Only the user who enabled secure mode can disable it',
      'فقط المستخدم الذي فعل الوضع الآمن يمكنه إلغاؤه'
    );
  }

  // toggle the secure property
  conversation.isSecure = !conversation.isSecure;

  // If enabling secure mode, record who enabled it
  if (conversation.isSecure) {
    conversation.secureEnabledBy = userId;
  } else {
    // If disabling secure mode, clear the secureEnabledBy field
    conversation.secureEnabledBy = null;
  }

  await conversation.save();
  const receiverId = conversation.participants.find((participant) => participant.toString() !== userId).toString();

  await messageSender.sendToUser(
    'conversationSecureToggled',
    {
      conversationId,
      isSecure: conversation.isSecure,
    },
    receiverId.toString(),
    false
  );
  return conversation;
};

/**
 * Set the background for a user in a conversation
 * @param {string} conversationId - The ID of the conversation
 * @param {string} userId - The ID of the user changing their background
 * @param {string} backgroundUrl - URL to the background image
 * @returns {Promise<Conversation>} - The updated conversation
 */
const setConversationBackground = async (conversationId, userId, backgroundUrl) => {
  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Conversation not found', 'المحادثة غير موجودة');
  }

  // Check if the user is a participant
  if (!conversation.participants.some((p) => p.toString() == userId)) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'You are not a participant in this conversation',
      'أنت لست مشاركًا في هذه المحادثة'
    );
  }

  // Set the background for this user
  conversation.setBackground(userId, backgroundUrl);
  await conversation.save();

  return conversation;
};

/**
 * Get the background for a user in a conversation
 * @param {string} conversationId - The ID of the conversation
 * @param {string} userId - The ID of the user
 * @returns {Promise<string|null>} - The background URL or null
 */
const getConversationBackground = async (conversationId, userId) => {
  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Conversation not found', 'المحادثة غير موجودة');
  }

  return conversation.getBackground(userId);
};

module.exports = {
  sendMessage,
  fetchMessages,
  markMessagesAsRead,
  getConversationById,
  startConversation,
  getUnreadConversationsCount,
  getTotalUnreadMessagesCount,
  getConversationByUsers,
  getAllConversations,
  sendGiftMessage,
  sendInvitationMessage,
  getConversationImages,
  getConversationIdByUsers,
  checkAccessForConversation,
  MESSAGE_TYPES,
  INVITATION_TYPES,
  deleteChatMessage,
  checkStickerAccess,
  deleteConversation,
  toggleConversationSecure,
  setConversationBackground,
  getConversationBackground,
};
