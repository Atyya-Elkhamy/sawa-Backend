// config/constants.js
module.exports = {
  MESSAGE_TYPES: {
    TEXT: 'text', //
    STICKER: 'emoji',
    IMAGE: 'image',
    AUDIO: 'voice',
    GIFT: 'gift',
    INVITATION: 'invitation',
  },
  INVITATION_TYPES: {
    ROOM: 'room',
    GROUP: 'group',
    AGENCY: 'agency',
  },
  deletedContent: {
    body: 'This message was deleted',
    bodyAr: 'تم حذف هذه الرسالة',
  },
  expiredContent: {
    body: 'رساله محذوفه منذ اكتر من 30 يوم',
    bodyAr: 'رساله محذوفه منذ اكتر من 30 يوم',
  },
};
