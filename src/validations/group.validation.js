const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createGroup = {
  body: Joi.object().keys({
    name: Joi.string().required().min(1).max(8),
    open: Joi.boolean().required(),
    cover: Joi.string().optional().allow(''),
    image: Joi.string().optional().allow(''),
  }),
  file: Joi.object().keys({
    cover: Joi.string().optional(),
    image: Joi.string().optional(),
  }),
};

// edit group data name , cover , image , open
const editGroup = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    open: Joi.boolean().required(),
    cover: Joi.string().optional().allow(''),
    image: Joi.string().optional().allow(''),
  }),
  file: Joi.object().keys({
    cover: Joi.string().optional(),
    image: Joi.string().optional(),
  }),
};

const getGroup = {
  params: Joi.object().keys({
    groupId: Joi.string().custom(objectId).required(),
  }),
};

const addMember = {
  params: Joi.object().keys({
    groupId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    userId: Joi.string().custom(objectId).required(),
  }),
};

const removeMember = {
  params: Joi.object().keys({
    groupId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    userId: Joi.string().custom(objectId).required(),
  }),
};

const handleJoinRequest = {
  params: Joi.object().keys({
    groupId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    userId: Joi.string().custom(objectId).required(),
    action: Joi.string().valid('accept', 'decline').required(),
  }),
};
const getRequests = {
  params: Joi.object().keys({
    groupId: Joi.string().custom(objectId).required(),
  }),
  query: Joi.object().keys({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(50),
  }),
};
const blockUser = {
  params: Joi.object().keys({
    groupId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    userId: Joi.string().custom(objectId).required(),
  }),
};
const inviteUser = {
  body: Joi.object().keys({
    userId: Joi.string().custom(objectId).required(),
    groupId: Joi.string().custom(objectId).required(),
  }),
};

const collectContributions = {
  params: Joi.object().keys({
    groupId: Joi.string().custom(objectId).required(),
  }),
};

const dailyContributions = {
  params: Joi.object().keys({
    groupId: Joi.string().custom(objectId).required(),
  }),
};

const monthlyContributions = {
  params: Joi.object().keys({
    groupId: Joi.string().custom(objectId).required(),
  }),
};

module.exports = {
  createGroup,
  getGroup,
  addMember,
  removeMember,
  handleJoinRequest,
  blockUser,
  getRequests,
  editGroup,
  inviteUser,
};
