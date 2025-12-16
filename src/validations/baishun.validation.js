const Joi = require('joi');

const getSsToken = {
  body: Joi.object().keys({
    app_id: Joi.number().integer().required(),
    user_id: Joi.string().required(),
    code: Joi.string().required(),
    signature_nonce: Joi.string().required(),
    timestamp: Joi.number().integer().required(),
    signature: Joi.string().length(32).required(),
    provider_name: Joi.string().optional(),
  })
};

const getUserInfo = {
  body: Joi.object().keys({
    app_id: Joi.number().integer().required(),
    user_id: Joi.string().required(),
    ss_token: Joi.string().required(),
    client_ip: Joi.string().optional().allow(''),
    game_id: Joi.number().integer().required(),
    signature_nonce: Joi.string().required(),
    timestamp: Joi.number().integer().required(),
    signature: Joi.string().length(32).required(),
    provider_name: Joi.string().optional()
  })
};

const updateSsToken = {
  body: Joi.object().keys({
    app_id: Joi.number().integer().required(),
    user_id: Joi.string().required(),
    ss_token: Joi.string().required(),
    signature_nonce: Joi.string().required(),
    timestamp: Joi.number().integer().required(),
    signature: Joi.string().length(32).required(),
    provider_name: Joi.string().optional()
  })
};

const changeBalance = {
  body: Joi.object().keys({
    app_id: Joi.number().integer().required(),
    user_id: Joi.string().required(),
    ss_token: Joi.string().required(),
    currency_diff: Joi.number().integer().required(),
    diff_msg: Joi.string().valid('bet', 'result', 'refund', 'buyin', 'buyout').required(),
    game_id: Joi.number().integer().required(),
    game_round_id: Joi.string().optional().allow(''),
    room_id: Joi.string().required(),
    change_time_at: Joi.number().integer().required(),
    order_id: Joi.string().required(),
    extend: Joi.string().optional().allow(''),
    msg_type: Joi.string().optional().allow(''),
    currency_type: Joi.number().integer().optional(),
    signature_nonce: Joi.string().required(),
    timestamp: Joi.number().integer().required(),
    signature: Joi.string().length(32).required(),
    provider_name: Joi.string().optional()
  })
};

module.exports = {
  getSsToken,
  getUserInfo,
  updateSsToken,
  changeBalance
};
