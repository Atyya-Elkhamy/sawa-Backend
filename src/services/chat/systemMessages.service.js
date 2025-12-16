const SystemMessage = require('../../models/chat/systemMessages.model');
const UserSystemMessageRead = require('../../models/chat/userSystemMessageRead.model');

const getUnreadSystemMessagesCount = async (userId) => {
  // Get user's last read timestamp
  const userRead = await UserSystemMessageRead.findOne({ userId });
  const lastReadAt = userRead ? userRead.lastReadAt : null;

  return SystemMessage.getUnreadSystemMessagesCount(userId, lastReadAt);
};

const getSystemMessagesByUser = async (userId, page = 1, limit = 20) => {
  // Get user's last read timestamp BEFORE updating it
  const userRead = await UserSystemMessageRead.findOne({ userId });
  const lastReadAt = userRead ? userRead.lastReadAt : null;

  const result = await SystemMessage.paginateSystemMessages(userId, page, limit, lastReadAt);

  // Update user's last read timestamp
  await UserSystemMessageRead.findOneAndUpdate({ userId }, { lastReadAt: new Date() }, { upsert: true });

  return result;
};

const getSystemMessagesByUserWithoutMarkingRead = async (userId, page = 1, limit = 20) => {
  // Get user's last read timestamp WITHOUT updating it
  const userRead = await UserSystemMessageRead.findOne({ userId });
  const lastReadAt = userRead ? userRead.lastReadAt : null;

  return SystemMessage.paginateSystemMessages(userId, page, limit, lastReadAt);
};

const addSystemMessage = async (receiverId, content) => {
  const systemMessage = await SystemMessage.create({
    receiverId,
    content,
    senderType: 'individual',
  });
  return systemMessage;
};

module.exports = {
  getUnreadSystemMessagesCount,
  getSystemMessagesByUser,
  getSystemMessagesByUserWithoutMarkingRead,
  addSystemMessage,
};
