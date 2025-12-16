const OneSignal = require('@onesignal/node-onesignal');
const config = require('../config/config');

class OneSignalService {
  constructor() {
    const configuration = OneSignal.createConfiguration({
      restApiKey: config.oneSignal.apiKey,
    });
    this.client = new OneSignal.DefaultApi(configuration);
    this.appId = config.oneSignal.appId;

    // Default configuration for all notifications
    this.defaultConfig = {
      app_id: this.appId,
      target_channel: 'push',
      large_icon: 'https://www.sawalive.live/logo.png',
      small_icon: 'https://www.sawalive.live/logo',
      // url: 'https://www.sawalive.live',
      chrome_web_icon: 'https://www.sawalive.live/logo.png',
      chrome_web_image: 'https://www.sawalive.live/logo.png',
      android_group_message: 'Default Group Message',
      android_group_summary: 'Default Group Summary',
      android_group_icon_color: '#000000',
    };
  }

  // Helper method to create base notification
  createBaseNotification(template) {
    const notification = new OneSignal.Notification();
    console.log('template', template);
    Object.assign(notification, this.defaultConfig, template);
    return notification;
  }

  // Template for new follower notification
  async sendNewFollowerNotification(userId, { followerId, followerName, followerAvatar }) {
    const template = {
      include_aliases: { external_id: [`${userId}`] },
      // included_segments: ['All'],
      contents: {
        en: `بدأ بمتابعتك!`,
        ar: `بدأ بمتابعتك!`,
      },
      headings: {
        en: `${followerName}`,
        ar: `${followerName}`,
      },
      large_icon: followerAvatar || this.defaultConfig.large_icon,
      data: {
        type: 'newFollower',
        followerId,
      },
    };
    return this.sendNotification(template);
  }

  // Template for new message notification
  async sendNewMessageNotification(
    userId,
    { senderId, senderName, senderAvatar, message, userData, conversationId, messageType }
  ) {
    const template = {
      include_aliases: { external_id: [`${userId}`] },

      contents: {
        en: message,
        ar: message,
      },
      headings: {
        en: `${senderName}`,
        ar: `${senderName}`,
      },
      large_icon: senderAvatar || this.defaultConfig.large_icon,
      data: {
        type: 'newMessage',
        senderId,
        conversationId,
        messageType,
        senderName,
        senderAvatar,
        userData: {
          id: userData.id,
          name: userData.name,
          avatar: userData.avatar,
          userId: userData.userId,
        },
      },
    };
    if (messageType === 'text') {
      template.contents.en = message;
      template.contents.ar = message;
    } else if (messageType === 'image') {
      template.contents.en = 'ارسل صورة جديدة';
      template.contents.ar = 'رسالة صورة جديدة';
    } else if (messageType === 'gift') {
      template.contents.en = 'ارسل هدية';
      template.contents.ar = 'رسالة هدية جديدة';
      template.large_icon = message || this.defaultConfig.large_icon;
    } else if (messageType === 'emoji') {
      template.contents.en = 'ارسل ملصق جديد';
      template.contents.ar = 'رسالة ملصق جديدة';
    } else if (messageType === 'voice') {
      template.contents.en = 'ارسل رسالة صوتية';
      template.contents.ar = 'رسالة صوتية جديدة';
    } else if (messageType === 'invitation') {
      template.contents.en = 'ارسل دعوة';
      template.contents.ar = 'رسالة دعوة جديدة';
    }

    return this.sendNotification(template);
  }

  // Template for stranger gift received notification
  async sendStrangerGiftNotification(userId, { senderId, senderName, senderAvatar, giftId, giftImage, roomId, amount }) {
    const template = {
      include_aliases: { external_id: [`${userId}`] },
      contents: {
        en: 'ارسل لك هدية',
        ar: 'ارسل لك هدية',
      },
      headings: {
        en: `${senderName}`,
        ar: `${senderName}`,
      },
      chrome_web_image: giftImage || this.defaultConfig.chrome_web_image,
      large_icon: giftImage || this.defaultConfig.large_icon,
      data: {
        type: 'strangerGiftReceived',
        senderId,
        giftId,
        roomId,
        amount,
      },
    };

    return this.sendNotification(template);
  }

  // Template for system message (individual)
  async sendSystemMessageIndividual(userId, { message, messageAr, imageUrl }) {
    const template = {
      include_aliases: { external_id: [`${userId}`] },
      contents: {
        en: message,
        ar: messageAr || message,
      },
      headings: {
        en: 'رسالة من النظام',
        ar: 'رسالة من النظام',
      },
      chrome_web_image: imageUrl || this.defaultConfig.chrome_web_image,
      data: {
        type: 'SystemMessage-individual',
      },
    };

    return this.sendNotification(template);
  }

  // Template for system broadcast message
  async sendSystemBroadcast({ message, messageAr, imageUrl }) {
    const template = {
      included_segments: ['All'],
      contents: {
        en: message,
        ar: messageAr || message,
      },
      headings: {
        en: 'رسالة عامة',
        ar: 'رسالة عامة',
      },
      chrome_web_image: imageUrl || this.defaultConfig.chrome_web_image,
      data: {
        type: 'SystemMessage-Broadcast',
      },
    };

    return this.sendNotification(template);
  }

  // Core method to send notification
  async sendNotification(template) {
    try {
      const notification = this.createBaseNotification(template);
      const response = await this.client.createNotification(notification);
      console.log('Notification sent successfully:', response);
      return response.data;
    } catch (error) {
      console.error('Error sending notification:', error.response?.data || error.message);
      throw error;
    }
  }
}

// const oneSignalService = new OneSignalService();

// const receiverId = '66f0564dd9ba5100207939e6';
// const message = 'Hello, world!';

// oneSignalService.sendNotification(`${receiverId}`, message);
// console.log('Notification sent to all users');

module.exports = new OneSignalService();
