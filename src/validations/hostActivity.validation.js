const Joi = require('joi');
const { objectId } = require('./custom.validation');

const getHostTotalTime = {
  params: Joi.object().keys({
    roomId: Joi.string().custom(objectId).required(),
    hostId: Joi.string().custom(objectId).required(),
  }),
};

const getHostActivityHistory = {
  params: Joi.object().keys({
    roomId: Joi.string().custom(objectId).required(),
    hostId: Joi.string().custom(objectId).required(),
  }),
};

module.exports = {
  getHostTotalTime,
  getHostActivityHistory,
};
