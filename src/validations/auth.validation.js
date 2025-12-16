const Joi = require('joi');
const { password } = require('./custom.validation');

// Shared attributes schema
const attributesSchema = Joi.object({
  hardware: Joi.object({
    board: Joi.required(),
    bootloader: Joi.required(),
    brand: Joi.required(),
    device: Joi.required(),
    fingerprint: Joi.required(),
    hardware: Joi.required(),
    host: Joi.required(),
    id: Joi.required(),
    manufacturer: Joi.required(),
    model: Joi.required(),
    product: Joi.required(),
    tags: Joi.required(),
    type: Joi.required(),
    systemFeatures: Joi.required(),
    supportedAbis: Joi.array().items(Joi.string().required()).required(),
    supported32BitAbis: Joi.array().items(Joi.string()),
    supported64BitAbis: Joi.optional().allow(''),
    sdkInt: Joi.number().required(),
    release: Joi.required(),
    codename: Joi.required(),
    name: Joi.optional(),
    systemName: Joi.optional(),
    systemVersion: Joi.optional(),
    localizedModel: Joi.optional(),
    identifierForVendor: Joi.optional(),
    machine: Joi.optional(),
    nodename: Joi.optional(),
    sysname: Joi.optional(),
    version: Joi.optional(),
  }).required(),

  system: Joi.object({
    deviceId: Joi.required(),
    operatingSystem: Joi.required(),
    androidId: Joi.required(),
    isEmulator: Joi.alternatives().try(Joi.boolean(), Joi.number().valid(0, 1)).required(),
  }).required(),

  app: Joi.object({
    appName: Joi.required(),
    packageName: Joi.required(),
    version: Joi.required(),
    buildNumber: Joi.required(),
    buildSignature: Joi.required(),
  }).required(),
}).required();


// REGISTER
const register = {
  body: Joi.object().keys({
    phone: Joi.string().required().pattern(/^[0-9]{12}$/),
    password: Joi.string().required().custom(password),
    name: Joi.string().required().min(3).max(16),
    email: Joi.string().email().optional(),
    avatar: Joi.string().optional().allow(''),
    dateOfBirth: Joi.date().required().max('2010-01-01').iso(),
    gender: Joi.string().valid('male', 'female').required(),
    token: Joi.string().required(),
    deviceToken: Joi.string().required(),
    attributes: attributesSchema,
    countryCode: Joi.any().optional().allow('', null).default('EG'),
    oneSignalPlayerId: Joi.string().optional().allow(''),
  }),
  file: Joi.any(),
};


// LOGIN
const login = {
  body: Joi.object().keys({
    phone: Joi.string().required().pattern(/^[0-9]{12}$/),
    password: Joi.string().required(),
    deviceToken: Joi.string().required(),
    attributes: attributesSchema,
    oneSignalPlayerId: Joi.string().optional().allow(''),
  }),
};


// LOGOUT
const logout = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};


// REFRESH TOKENS
const refreshTokens = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};


// FORGOT PASSWORD
const forgotPassword = {
  body: Joi.object().keys({
    phone: Joi.string().required().pattern(/^[0-9]{12}$/),
  }),
};


// RESET PASSWORD
const resetPassword = {
  query: Joi.object().keys({
    token: Joi.string().required(),
  }),
  body: Joi.object().keys({
    password: Joi.string().required().custom(password),
  }),
};


// CHANGE PASSWORD
const changePassword = {
  body: Joi.object().keys({
    oldPassword: Joi.string().required(),
    newPassword: Joi.string().required().custom(password),
  }),
};


// VERIFY EMAIL
const verifyEmail = {
  query: Joi.object().keys({
    token: Joi.string().required(),
  }),
};


// SEND OTP
const sendOtp = {
  body: Joi.object().keys({
    phone: Joi.string().required().pattern(/^[0-9]{12}$/),
  }),
};


// VERIFY OTP
const verifyOtp = {
  body: Joi.object().keys({
    phone: Joi.string().required().pattern(/^[0-9]{12}$/),
    otp: Joi.string().required().length(6),
  }),
};


// SOCIAL LOGIN
const socialLogin = {
  body: Joi.object().keys({
    deviceToken: Joi.string().required(),
    accessToken: Joi.string().required(),
    countryCode: Joi.any().optional().default('EG'),
    attributes: attributesSchema,
  }),
};


// EXPORTS
module.exports = {
  register,
  login,
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  verifyEmail,
  sendOtp,
  verifyOtp,
  changePassword,
  socialLogin,
};

// .array().items(Joi.string())