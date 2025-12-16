const Joi = require('joi');

const createRoomPost = {
  body: Joi.object().keys({
    message: Joi.string().required(),
    countryCode: Joi.string().optional().default('SA').allow(''),
    roomId: Joi.string().required(),
  }),
};

const createLiveMessage = {
  body: Joi.object().keys({
    message: Joi.string().required(),
  }),
  params: Joi.object().keys({
    roomId: Joi.string().required(),
  }),
};

module.exports = {
  createRoomPost,
  createLiveMessage,
};
