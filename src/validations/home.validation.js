const Joi = require('joi');
// const { objectId } = require('./custom.validation');

const getLeaderboard = {
  query: Joi.object().keys({
    page: Joi.number().min(1),
    limit: Joi.number().min(1).max(100),
    //
    type: Joi.string().valid('richPoints', 'famePoints').default('richPoints'),
    period: Joi.string().valid('today', 'week', 'month').required(),
  }),
};

const getUserRank = {
  query: Joi.object().keys({
    type: Joi.string().required(),
  }),
};

module.exports = {
  getLeaderboard,
  getUserRank,
};
