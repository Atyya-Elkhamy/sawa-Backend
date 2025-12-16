const Joi = require('joi');

const getPeriodicInfo = {
  query: Joi.object().keys({
    period: Joi.string().valid('weekly', 'monthly').default('weekly'),
  }),
};

const collectPrize = {
  params: Joi.object().keys({
    prizeId: Joi.string().required(),
  }),
};

module.exports = {
  getPeriodicInfo,
  collectPrize,
};
