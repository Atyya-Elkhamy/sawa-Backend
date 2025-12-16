const Joi = require('joi');
const { itemTypesArray } = require('../config/stores.config');

const createItem = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    description: Joi.string().optional(),
    price: Joi.number().required(),
    type: Joi.string()
      .required()
      .valid(...itemTypesArray),
    isTopProduct: Joi.boolean().optional(),
  }),
  files: Joi.any(),
};

// edit item
const editItem = {
  body: Joi.object().keys({
    name: Joi.string().optional(),
    description: Joi.string().optional(),
    price: Joi.number().required(),
    type: Joi.string()
      .required()
      .valid(...itemTypesArray),
    isTopProduct: Joi.boolean().optional(),
    isHidden: Joi.boolean().optional(),
  }),
  files: Joi.any(),
};

const createGift = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    category: Joi.string().optional(),
    price: Joi.number().required(),
    gameMultiplier: Joi.number().optional(),
  }),
  // 2 files
  files: Joi.any(),
};

const buyItem = {
  body: Joi.object().keys({
    recipientUserId: Joi.string().required(),
    durationOption: Joi.number().valid(7, 15, 30).required().messages({ 'any.only': 'Duration option must be 1, 2, or 3' }),
  }),
};

const sendGift = {
  body: Joi.object().keys({
    giftId: Joi.string().required(),
    recipientIds: Joi.array().items(Joi.string().required()).required(),
    amount: Joi.number().integer().min(1).optional().default(1),
    message: Joi.string().optional(),
  }),
  query: Joi.object().keys({
    groupId: Joi.string().optional().allow(''),
    roomId: Joi.string().optional().allow(''),
    fromChat: Joi.string().optional().allow(''),
    isFree: Joi.boolean().optional().allow(''),
  }),
};

const subscribeVip = {
  body: Joi.object().keys({
    level: Joi.number().required().valid(1, 2, 3, 4, 5, 6, 7),
    days: Joi.number().required().valid(7, 15, 30),
  }),
};

const subscribePro = {
  body: Joi.object().keys({
    months: Joi.number().required().valid(1, 2, 3),
  }),
};

const vipTransferCredits = {
  body: Joi.object().keys({
    userId: Joi.string().required(),
    amount: Joi.number().required().min(1),
    tokenized: Joi.string().optional().allow(''),
  }),
};
const TransferCredits = {
  body: Joi.object().keys({
    userId: Joi.string().required(),
    amount: Joi.number().required().min(1),
    roomId: Joi.string().optional(),
  }),
};

// edit gift
const editGift = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    category: Joi.string().optional(),
    price: Joi.number().required(),
    gameMultiplier: Joi.number().optional(),
  }),
  files: Joi.any(),
};

const getSectionByType = {
  params: Joi.object().keys({
    sectionType: Joi.string()
      .required()
      .valid(...itemTypesArray)
      .messages({
        'any.only': 'Invalid section type',
      }),
  }),
};

module.exports = {
  createItem,
  createGift,
  buyItem,
  sendGift,
  subscribeVip,
  subscribePro,
  vipTransferCredits,
  TransferCredits,
  editGift,
  getSectionByType,
  editItem,
};
