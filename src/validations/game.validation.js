const Joi = require('joi');
const { objectId } = require('./custom.validation');

const addGame = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    image: Joi.string().required(),
    link: Joi.string().required(),
    description: Joi.string().optional(),
  }),
};

const editGame = {
  params: Joi.object().keys({
    gameId: Joi.string().custom(objectId).optional(),
  }),
  body: Joi.object().keys({
    name: Joi.string().optional(),
    image: Joi.string().optional(),
    link: Joi.string().optional(),
    description: Joi.string().optional(),
    active: Joi.boolean().optional(),
    gifts: Joi.array().items(Joi.string().custom(objectId)).optional(),
    storeItems: Joi.array().items(Joi.string().custom(objectId)).optional(),
  }),
};
const sendGift = {
  body: Joi.object().keys({
    recipientId: Joi.string().required(),
    giftId: Joi.string().required(),
    amount: Joi.number().integer().min(1).default(1),
    message: Joi.string().optional().allow(''),
  }),
  headers: Joi.object()
    .keys({
      'x-api-key': Joi.string().required(), // Validate API key presence
    })
    .unknown(true),
};

const getLeaderBoard = {
  query: Joi.object().keys({
    // gameId: Joi.string().required(),
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    round: Joi.number().integer().optional(), // For round-specific leaderboard
  }),
  headers: Joi.object()
    .keys({
      'x-api-key': Joi.string().required(), // Validate API key presence
    })
    .unknown(true),
};

const increaseUserBalance = {
  body: Joi.object().keys({
    userId: Joi.string().required(),
    amount: Joi.number().required().min(0),
    description: Joi.string().optional().allow(''),
    descriptionAr: Joi.string().optional().allow(''),
    round: Joi.number().integer().optional(),
  }),
  headers: Joi.object()
    .keys({
      'x-api-key': Joi.string().required(), // Validate API key presence
    })
    .unknown(true),
};

const getUserProfitHistory = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
  headers: Joi.object()
    .keys({
      'x-api-key': Joi.string().required(), // Validate API key presence
    })
    .unknown(true),
};

const deductUserBalance = {
  body: Joi.object().keys({
    userId: Joi.string().required(),
    amount: Joi.number().required().min(0),
    description: Joi.string().optional().allow(''),
    descriptionAr: Joi.string().optional().allow(''),
  }),
  headers: Joi.object()
    .keys({
      'x-api-key': Joi.string().required(), // Validate API key presence
    })
    .unknown(true),
};

const generateApiKey = {
  body: Joi.object().keys({
    gameId: Joi.string().required(), // Validate gameId presence
  }),
};

const deactivateApiKey = {
  body: Joi.object().keys({
    key: Joi.string().required(), // Validate key presence
  }),
};

const sendMultipleGifts = {
  body: Joi.object().keys({
    recipientId: Joi.string().required(),
    gifts: Joi.array()
      .items(
        Joi.object().keys({
          giftId: Joi.string().required(),
          amount: Joi.number().integer().min(1).required(),
        })
      )
      .required(),
  }),
};

const addStoreItemToUserBag = {
  body: Joi.object().keys({
    userId: Joi.string().required(),
    itemId: Joi.string().required(),
    durationOption: Joi.number().valid(7, 15, 30).default(1),
  }),
};
const setRoomGame = {
  body: Joi.object().keys({
    roomId: Joi.string().required(),
    gameRoomId: Joi.string().optional().allow(''),
  }),
};

module.exports = {
  addGame,
  editGame,
  sendGift,
  getLeaderBoard,
  generateApiKey,
  deactivateApiKey,
  getUserProfitHistory,
  deductUserBalance,
  increaseUserBalance,
  sendMultipleGifts,
  addStoreItemToUserBag,
  setRoomGame,
};
