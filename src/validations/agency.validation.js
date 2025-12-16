const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createAgency = {
  body: Joi.object().keys({
    name: Joi.string().required(),
  }),
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId).required(),
  }),
};

const createCreditAgency = {
  body: Joi.object().keys({
    name: Joi.string().required(),
  }),
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId).required(),
  }),
};

const getCreditAgencyHistory = {
  query: Joi.object().keys({
    date: Joi.number().max(31).min(1).default(1),
    limit: Joi.number().default(10),
    page: Joi.number().default(1),
  }),
};

const transferCreditsFromCreditAgency = {
  body: Joi.object().keys({
    transfers: Joi.array()
      .required()
      .items(
        Joi.object().keys({
          toUserId: Joi.string().custom(objectId).required(),
          amount: Joi.number().required(),
        })
      ),
  }),
};

const getAgency = {
  params: Joi.object().keys({
    agencyId: Joi.string().custom(objectId).required(),
  }),
};

const addHost = {
  params: Joi.object().keys({
    agencyId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    userId: Joi.string().custom(objectId).required(),
    targets: Joi.object()
      .keys({
        dailyTarget: Joi.number().required(),
        monthlyTarget: Joi.number().required(),
      })
      .required(),
  }),
};

const getAgencyStatistics = {
  params: Joi.object().keys({
    agencyId: Joi.string().custom(objectId).required(),
  }),
};
const transferCash = {
  body: Joi.object().keys({
    toUserId: Joi.string().custom(objectId),
    toCreditAgencyId: Joi.string().custom(objectId),
    amount: Joi.number().required(),
  }),
};
const searchAgencies = {
  query: Joi.object().keys({
    page: Joi.number().default(1).min(1),
    limit: Joi.number().default(10).max(100).min(1),
    query: Joi.string().allow('').optional(),
  }),
};
const getPublicAgencyData = {
  params: Joi.object().keys({
    agencyId: Joi.string().custom(objectId).required(),
  }),
};
const inviteUserValidation = {
  body: Joi.object().keys({
    userId: Joi.string().required(),
    agencyId: Joi.string().required(),
  }),
};

const agencyRequestValidation = {
  body: Joi.object().keys({
    requestId: Joi.string().required(),
  }),
};
const agencyInviteValidation = {
  body: Joi.object().keys({
    requestId: Joi.string().required(),
  }),
};

const userRequestValidation = {
  body: Joi.object().keys({
    agencyId: Joi.string().required(),
  }),
};

const paginationValidation = {
  body: Joi.object().keys({
    agencyId: Joi.string().required(),
  }),
  params: Joi.object().keys({
    page: Joi.number().default(1).min(1),
    limit: Joi.number().default(10).max(100),
  }),
};
module.exports = {
  createAgency,
  getAgency,
  addHost,
  getAgencyStatistics,
  createCreditAgency,
  transferCreditsFromCreditAgency,
  getCreditAgencyHistory,
  transferCash,
  searchAgencies,
  getPublicAgencyData,
  inviteUserValidation,
  agencyRequestValidation,
  userRequestValidation,
  paginationValidation,
  agencyInviteValidation,
};
