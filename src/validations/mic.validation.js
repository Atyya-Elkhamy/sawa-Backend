const Joi = require('joi');
const { objectId } = require('./custom.validation');


const changeMicState = {
  params: Joi.object().keys({
    roomId: Joi.string().custom(objectId).required(),
    micNumber: Joi.number().integer().min(0).required(),
  }),
  body: Joi.object().keys({
    state: Joi.string().valid('noSpeaker', 'hasSpeaker', 'locked', 'muted').required(),
  }),
};


const addMicToRoom = {
  params: Joi.object().keys({
    roomId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      micNumber: Joi.number().integer().min(0).required(),
      micUserId: Joi.string().custom(objectId).allow(null).optional(),
      micUserName: Joi.string().allow(null).optional(),
      micImage: Joi.string().uri().allow(null).optional(),
      micUserAvatarFrame: Joi.string().allow(null).optional(),
      micUserCharsimaCount: Joi.number().min(0).optional(),
      micUserIsMale: Joi.boolean().optional(),
      micEmoji: Joi.string().allow(null, '').optional(),
      micEmojiDuration: Joi.number().optional(),
      roomMicState: Joi.string()
        .valid('noSpeaker', 'hasSpeaker', 'muted', 'locked')
        .default('noSpeaker'),
      isActive: Joi.boolean().default(true),
      type: Joi.string()
        .valid('regular', 'host', 'vip', 'king', 'boss')
        .default('regular'),
      vipMicEffect: Joi.string().allow(null, '').optional(),
      vipLevel: Joi.number().optional(),
      isPro: Joi.boolean().optional(),
      isTopMic: Joi.boolean().optional(),
    })
    .required(),
};

module.exports = {
  changeMicState,
  addMicToRoom,
};
