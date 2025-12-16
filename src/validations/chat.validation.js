const Joi = require('joi');
const { MESSAGE_TYPES } = require('../config/chat.config');

const sendMessage = {
  body: Joi.object()
    .keys({
      type: Joi.string()
        .valid(...Object.values(MESSAGE_TYPES))
        .required(),
      text: Joi.string().optional(),
      stickerId: Joi.string().optional(),
      receiverId: Joi.string().required(),
    })
    .xor('text', 'stickerId'), // Either text or stickerId must be present
};

const sendMedia = {
  body: Joi.object().keys({
    type: Joi.string()
      .valid(...Object.values(MESSAGE_TYPES))
      .required(),
    audioDuration: Joi.any(),
    receiverId: Joi.string().required(),
  }),
};

const startConversation = {
  body: Joi.object().keys({
    receiverId: Joi.string().required(),
  }),
};

const sendSystemMessage = {
  body: Joi.object().keys({
    receiverId: Joi.string().required(),
    content: Joi.object().keys({
      text: Joi.string().required(),
      textAr: Joi.string().optional(),
      imageUrl: Joi.string().optional(),
      link: Joi.string().optional(),
    }),
  }),
};

const deleteConversation = {
  body: Joi.object().keys({
    conversationId: Joi.string().required(),
    selfDelete: Joi.boolean().optional(),
  }),
};
const toggleConversationSecure = {
  body: Joi.object().keys({
    conversationId: Joi.string().required(),
  }),
};

module.exports = {
  sendMessage,
  sendMedia,
  startConversation,
  sendSystemMessage,
  deleteConversation,
  toggleConversationSecure,
};
