/* eslint-disable class-methods-use-this */
// services/chat/messageSender.js
const logger = require('../../config/logger');
const { redisClient } = require('../../config/redis');
const oneSignalService = require('../oneSignal.service');
const { getIo } = require('../../socket');

const responseStatus = {
  SOCKET_SENT: 'S',
  SOCKET_NOT_SENT: 'NS',
};

class MessageSender {
  constructor() {
    // Bind methods to ensure 'this' context is preserved
    this.sendToUser = this.sendToUser.bind(this);
    this.sendToAll = this.sendToAll.bind(this);
    this.handleOfflineNotification = this.handleOfflineNotification.bind(this);
    this.handleBroadcastNotification = this.handleBroadcastNotification.bind(this);
    this.sendRoomUpdate = this.sendRoomUpdate.bind(this);
    this.responseStatus = responseStatus;
  }

  /**
   * Send a socket message with optional OneSignal notification
   * @param {string} event - Socket event name
   * @param {object} data - Message data
   * @param {string} userId - Target user ID
   * @param {boolean} useOneSignal - Whether to send OneSignal notification if user is offline
   */
  async sendToUser(event, data, userId, useOneSignal = false) {
    try {
      logger.info(`Sending ${event} to user ${userId} %o`, { data });
      // log all active socket connections
      const receiverSocketId = await redisClient.hGet('connectedUsers', userId);

      if (receiverSocketId) {
        const io = getIo();
        if (!io) {
          logger.error('Socket.io not initialized');
          return;
        }
        io.to(receiverSocketId).emit(event, data);
        logger.info(`Event ${event} sent via socket to ${userId}`);
        return responseStatus.SOCKET_SENT;
      }

      logger.info(`User ${userId} is offline. OneSignal: ${useOneSignal}`);
      if (useOneSignal) {
        await this.handleOfflineNotification(event, data, userId);
      }
    } catch (error) {
      logger.error(`Error in sendToUser: ${error.message} %o`, { event, userId, error });
    }
  }

  /**
   * Send data to all users
   * @param {string} event - Socket event name
   * @param {object} data - Message data
   * @param {boolean} useOneSignal - Whether to send OneSignal broadcast
   */
  async sendToAll(event, data, useOneSignal = false) {
    try {
      const io = getIo();
      if (!io) {
        logger.error('Socket.io not initialized');
        return;
      }
      console.log('Broadcasting event:', event);

      logger.info(`Broadcasting ${event} to all users %o`, { data });
      io.emit(event, data);

      if (useOneSignal) {
        await this.handleBroadcastNotification(event, data);
      }
    } catch (error) {
      logger.error(`Error in sendToAll: ${error.message}`, { event, error });
      throw error; // Re-throw to handle it in the calling service
    }
  }

  /**
   * Handle OneSignal notifications for offline users
   * @param {string} event
   * @param {object} data
   * @param {string} userId
   * @private
   */
  async handleOfflineNotification(event, data, userId) {
    try {
      logger.info(`Handling offline notification for event: ${event}`, { userId, data });
      // first check profile settings to determine if the user has notifications enabled
      // eslint-disable-next-line global-require
      const userSettings = await require('../user.service').getSettings(userId);
      switch (event) {
        case 'newMessage':
          if (userSettings.friendsMessages) {
            await oneSignalService.sendNewMessageNotification(userId, {
              senderId: data.senderId,
              senderName: data.senderName,
              senderAvatar: data.senderAvatar,
              messageType: data.messageType,
              userData: data.userData,
              message: data.content.text || data.content.body,
              conversationId: data.conversationId,
            });
          }
          break;

        case 'newFollower':
          if (userSettings.addFollowers) {
            await oneSignalService.sendNewFollowerNotification(userId, {
              followerId: data.followerId,
              followerName: data.name,
              followerAvatar: data.avatar,
            });
          }
          break;

        case 'strangerGiftReceived':
          if (userSettings.giftsFromPossibleFriends) {
            await oneSignalService.sendStrangerGiftNotification(userId, {
              senderId: data.senderId,
              senderName: data.senderName,
              senderAvatar: data.senderAvatar,
              giftId: data.giftId,
              giftImage: data.giftImage,
              roomId: data.roomId,
              amount: data.amount,
            });
          }
          break;

        case 'SystemMessage-individual':
          if (userSettings.systemMessages) {
            await oneSignalService.sendSystemMessageIndividual(userId, {
              message: data.content.text,
              messageAr: data.content.textAr,
              imageUrl: data.content.imageUrl,
            });
          }
          break;

        default:
          logger.warn(`No OneSignal template for event: ${event}`);
      }
    } catch (error) {
      logger.error(`Error sending OneSignal notification: ${error.message}`, { event, userId, error });
    }
  }

  /**
   * Handle OneSignal broadcast notifications
   * @param {string} event
   * @param {object} data
   * @private
   */
  async handleBroadcastNotification(event, data) {
    try {
      switch (event) {
        case 'SystemMessage-Broadcast':
          await oneSignalService.sendSystemBroadcast({
            message: data.content.text,
            messageAr: data.content.textAr,
            imageUrl: data.content.imageUrl,
          });
          break;

        case 'liveMessage':
          await oneSignalService.sendSystemBroadcast({
            message: data.message,
            roomId: data.room,
            roomName: data.roomName,
            roomImage: data.image,
            background: data.background,
            roomType: data.roomType,
            isPrivate: data.isPrivate,
          });
          break;

        default:
          logger.warn(`No broadcast template for event: ${event}`);
      }
    } catch (error) {
      logger.error(`Error sending broadcast notification: ${error.message}`, { event, error });
      throw error; // Re-throw to handle it in the calling service
    }
  }

  /**
   * Send room update to all users
   * @param {string} roomId - Room ID
   * @param {boolean} isActive - Room active status
   */
  async sendRoomUpdate(roomId, isActive) {
    try {
      const io = getIo();
      if (!io) {
        logger.error('Socket.io not initialized');
        return;
      }
      io.emit('roomAdminLeave', { roomId, isActive });
      logger.info(`Room update sent for ${roomId}`, { isActive });
    } catch (error) {
      logger.error(`Error sending room update: ${error.message}`, { roomId, error });
    }
  }

  /**
   * check if the user is Connected in the socket and in conversation via redis
   * @param {string} userId - User ID
   * @param {string} ConversationId - Conversation ID
   * @returns {boolean} - True if user is connected, false otherwise
   */
  async isUserInConversation(userId, ConversationId) {
    try {
      const receiverSocketId = await redisClient.hGet('connectedUsers', userId);
      if (receiverSocketId) {
        const conversationId = await redisClient.hGet(`userConversations:${userId}`, 'currentConversation');
        if (conversationId === ConversationId) {
          logger.info(`User ${userId} is connected and in conversation ${ConversationId}`);
          return true;
        }
        logger.info(`User ${userId} is connected but not in conversation ${ConversationId}`);
      }
      return false;
    } catch (error) {
      logger.error(`Error checking user connection: ${error.message}`, { userId, ConversationId, error });
      return false;
    }
  }
}

// Export a singleton instance
module.exports = new MessageSender();
