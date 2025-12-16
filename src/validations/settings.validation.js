const Joi = require('joi');
// const { objectId } = require('./custom.validation');

const addActivity = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    link: Joi.string().required(),
  }),
  // 1 file
  file: Joi.any(),
};

const editActivity = {
  body: Joi.object().keys({
    name: Joi.string().optional(),
    link: Joi.string().optional(),
  }),
  // 1 file
  file: Joi.any(),
};

module.exports = {
  addActivity,
  editActivity,
};
