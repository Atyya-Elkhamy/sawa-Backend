// validations/specialId.validation.js

const Joi = require('joi');

const purchaseSpecialId = {
  params: Joi.object().keys({
    specialIdId: Joi.string().required().hex().length(24),
  }),
  body: Joi.object().keys({
    recipientUserId: Joi.string().required().hex().length(24),
    duration: Joi.number().integer().min(1).max(365).required(),
  }),
};

const activateSpecialId = {
  params: Joi.object().keys({
    userSpecialIdId: Joi.string().required().hex().length(24),
  }),
};

const createSpecialId = {
  body: Joi.object().keys({
    name: Joi.string().required().trim().min(3).max(30),
    value: Joi.string().required().trim().pattern(/^[a-zA-Z0-9_]{1,15}$/).message('Special ID must be alphanumeric and between 1-15 characters'),
    price: Joi.number().integer().min(0).required(),
    description: Joi.string().optional().max(200),
    vipLevel: Joi.number().integer().min(0).max(7).default(0),
    isVipExclusive: Joi.boolean().default(false),
    category: Joi.string().valid('premium', 'standard', 'vip_exclusive').default('standard'),
    isHidden: Joi.boolean().default(false),
  }),
};

const updateSpecialId = {
  params: Joi.object().keys({
    specialIdId: Joi.string().required().hex().length(24),
  }),
  body: Joi.object().keys({
    name: Joi.string().optional().trim().min(3).max(30),
    value: Joi.string().optional().trim().pattern(/^[a-zA-Z0-9_]{1,15}$/).message('Special ID must be alphanumeric and between 1-15 characters'),
    price: Joi.number().integer().min(0).optional(),
    description: Joi.string().optional().max(200),
    vipLevel: Joi.number().integer().min(0).max(7).optional(),
    isVipExclusive: Joi.boolean().optional(),
    category: Joi.string().valid('premium', 'standard', 'vip_exclusive').optional(),
    isHidden: Joi.boolean().optional(),
    isAvailable: Joi.boolean().optional(),
  }),
};

const deleteSpecialId = {
  params: Joi.object().keys({
    specialIdId: Joi.string().required().hex().length(24),
  }),
};

const getSpecialIdById = {
  params: Joi.object().keys({
    specialIdId: Joi.string().required().hex().length(24),
  }),
};

const getAllSpecialIds = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    vipLevel: Joi.number().integer().min(0).max(7).optional(),
    isAvailable: Joi.string().valid('true', 'false').optional(),
    category: Joi.string().valid('premium', 'standard', 'vip_exclusive').optional(),
  }),
};

module.exports = {
  purchaseSpecialId,
  activateSpecialId,
  createSpecialId,
  updateSpecialId,
  deleteSpecialId,
  getSpecialIdById,
  getAllSpecialIds,
};
