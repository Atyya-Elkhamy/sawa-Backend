const jwt = require('jsonwebtoken');
const moment = require('moment');
const httpStatus = require('http-status');
const twilio = require('twilio');
const config = require('../config/config');
const userService = require('./user.service');
const { Token } = require('../models');
const ApiError = require('../utils/ApiError');
const { tokenTypes } = require('../config/tokens');
const DeviceToken = require('../models/auth/deviceToken.model');
const User = require('../models/user.model');
/**
 *
 * @param {*} deviceToken
 * @param {*} userId
 * @param {*} type
 * @param {*} skipCheck
 * @returns
 */

const checkDeviceToken = async (deviceToken, userId, type) => {
  const blacklisted = await DeviceToken.isBlacklisted(deviceToken);
  if (blacklisted) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'you are blocked', 'تم حظرك');
  }
  let deviceTokenDoc = await DeviceToken.findOne({ token: deviceToken });
  console.log("The device token doc is:", deviceTokenDoc);
  if (!deviceTokenDoc) {
    deviceTokenDoc = await DeviceToken.findOne({ user: userId });
    if (!deviceTokenDoc) {
      deviceTokenDoc = await DeviceToken.create({
        token: deviceToken,
        user: userId,
        type,
        blacklisted: false,
      });
    } else {
      // throw error if the device token is not valid
      throw new ApiError(httpStatus.BAD_REQUEST, 'Device token is not valid', 'رمز الجهاز غير صالح');
    }
  }

  if (deviceTokenDoc.user.toString() !== userId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Device token is not valid', 'رمز الجهاز غير صالح');
  }
  return deviceTokenDoc;
};

/**
 * Generate token
 * @param {ObjectId} userId
 * @param {Moment} expires
 * @param {string} type
 * @param {string} [secret]
 * @returns {string}
 */
const generateToken = (userId, expires, type, secret = config.jwt.secret) => {
  const payload = {
    sub: userId,
    iat: moment().unix(),
    exp: expires.unix(),
    type,
  };
  return jwt.sign(payload, secret);
};

/**
 * Save a token
 * @param {string} token
 * @param {ObjectId} userId
 * @param {Moment} expires
 * @param {string} type
 * @param {boolean} [blacklisted]
 * @param otp
 * @param phone
 * @returns {Promise<Token>}
 */
const saveToken = async (token, userId, expires, type, blacklisted = false, otp = null, phone = null) => {
  const tokenDoc = await Token.create({
    token,
    user: userId,
    expires: expires.toDate(),
    type,
    blacklisted,
    otp,
    phone,
  });
  return tokenDoc;
};

/**
 * Verify token and return token doc (or throw an error if it is not valid)
 * @param {string} token
 * @param {string} type
 * @returns {Promise<Token>}
 */
const verifyToken = async (token, type) => {
  const payload = jwt.verify(token, config.jwt.secret);
  const tokenDoc = await Token.findOne({
    token,
    type,
    user: payload.sub,
    blacklisted: false,
  });
  if (!tokenDoc) {
    throw new Error('Token not found');
  }
  return tokenDoc;
};

/**
 * Generate auth tokens
 * @param {User} user
 * @param deviceToken
 * @param skipCheck
 * @param loginType
 * @returns {Promise<object>}
 */
const generateAuthTokens = async (user, deviceToken, loginType = 'phone', skipCheck = false) => {
  if (!skipCheck) {
    await checkDeviceToken(deviceToken, user.id, loginType);
  }
  const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
  const accessToken = generateToken(user.id, accessTokenExpires, tokenTypes.ACCESS);

  const refreshTokenExpires = moment().add(config.jwt.refreshExpirationDays, 'days');
  const refreshToken = generateToken(user.id, refreshTokenExpires, tokenTypes.REFRESH);
  await saveToken(refreshToken, user.id, refreshTokenExpires, tokenTypes.REFRESH);

  return {
    access: {
      token: accessToken,
      expires: accessTokenExpires.toDate(),
    },
    refresh: {
      token: refreshToken,
      expires: refreshTokenExpires.toDate(),
    },
  };
};

/**
 * Generate access token for a user by userId
 * @param {string} userId
 * @returns {Promise<object>}
 */
const generateAccessToken = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }
  const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
  const accessToken = generateToken(user.id, accessTokenExpires, tokenTypes.ACCESS);
  return {
    token: accessToken,
    expires: accessTokenExpires.toDate(),
  };
};

/**

/**
 * Delete all tokens of a user and  device token (optional)
 * @param {string} userId
 * @param {boolean} deleteDeviceToken
 * @returns {Promise<void>}
 */
const deleteTokens = async (userId, deleteDeviceToken = false) => {
  await Token.deleteMany({ user: userId });
  if (deleteDeviceToken) {
    await DeviceToken.deleteMany({ user: userId });
  }
};
/**
 * Generate reset password token
 * @param {string} email
 * @param phone
 * @returns {Promise<string>}
 */
const generateResetPasswordToken = async (phone) => {
  const user = await userService.getUserByPhone(phone);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No users found with this phone number', 'لا يوجد مستخدمين مسجلين بهذا الرقم');
  }
  const otp = Math.floor(100000 + Math.random() * 900000); // Generate a 6-digit OTP
  const expires = moment().add(config.jwt.resetPasswordExpirationMinutes, 'minutes');
  const resetPasswordToken = generateToken(user.id, expires, tokenTypes.RESET_PASSWORD, config.jwt.secret);
  await saveToken(resetPasswordToken, user.id, expires, tokenTypes.RESET_PASSWORD, false, otp, phone);
  return otp;
};

/**
 * Generate verify email token
 * @param {User} user
 * @returns {Promise<string>}
 */
const generateVerifyEmailToken = async (user) => {
  const expires = moment().add(config.jwt.verifyEmailExpirationMinutes, 'minutes');
  const verifyEmailToken = generateToken(user.id, expires, tokenTypes.VERIFY_EMAIL);
  await saveToken(verifyEmailToken, user.id, expires, tokenTypes.VERIFY_EMAIL);
  return verifyEmailToken;
};

/**
 * Send OTP via Twilio SMS
 * @param {string} phoneNumber
 * @param {string} otp
 * @returns {Promise<object>}
 */

// const sendOtpViaWhatsApp = async (phoneNumber, otp) => {
//   const { accountSid, authToken, twilioPhoneNumber } = config.twilio;

//   // Validate configuration
//   if (!accountSid || !authToken || !twilioPhoneNumber) {
//     throw new ApiError(
//       httpStatus.INTERNAL_SERVER_ERROR,
//       'Twilio configuration is incomplete',
//       'إعدادات Twilio غير مكتملة'
//     );
//   }
//   // Create Twilio client
//   const client = twilio(accountSid, authToken);
//   // Normalize and validate the recipient number
//   let formattedNumber = phoneNumber.trim();
//   if (!formattedNumber.startsWith('+')) {
//     formattedNumber = `+${formattedNumber}`;
//   }
//   console.log('Sending OTP to WhatsApp number:', formattedNumber);
//   // Build message parameters
//   const messageOptions = {
//     body: `Your verification code is: ${otp}`,
//     from: `whatsapp:${twilioPhoneNumber}`, // Use Twilio sandbox or approved number
//     to: `whatsapp:${formattedNumber}`,
//   };
//   try {
//     // Send message
//     const message = await client.messages.create(messageOptions);
//     // Return structured result
//     return {
//       messageId: message.sid,
//       status: message.status,
//       to: message.to,
//     };
//   } catch (error) {
//     console.error('Twilio WhatsApp Error:', {
//       message: error.message,
//       code: error.code,
//       moreInfo: error.moreInfo,
//     });
//     // Differentiate error type for better debugging
//     if (error.code === 63003) {
//       // 63003 => User has not joined Twilio sandbox
//       throw new ApiError(
//         httpStatus.BAD_REQUEST,
//         'Recipient has not joined the Twilio WhatsApp sandbox',
//         'المستلم لم ينضم بعد إلى صندوق واتساب التجريبي'
//       );
//     }
//     throw new ApiError(
//       httpStatus.INTERNAL_SERVER_ERROR,
//       'Failed to send OTP via WhatsApp',
//       'فشل إرسال رمز التحقق عبر واتساب'
//     );
//   }
// };

const sendOtpViaWhatsApp = async (phoneNumber, otp) => {
  const { accountSid, authToken, twilioPhoneNumber } = config.twilio;
  // Validate configuration
  if (!accountSid || !authToken || !twilioPhoneNumber) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Twilio configuration is incomplete',
      'إعدادات Twilio غير مكتملة'
    );
  }
  console.log('the twilio number isssss ',twilioPhoneNumber)
  const client = twilio(accountSid, authToken);
  let formattedNumber = phoneNumber.trim();
  if (!formattedNumber.startsWith('+')) {
    formattedNumber = `+${formattedNumber}`;
  }
  console.log('Sending OTP to WhatsApp number:', formattedNumber);
  const messageOptions = {
    body: `Your verification code is: ${otp}`,
    from: `whatsapp:${twilioPhoneNumber}`,
    to: `whatsapp:${formattedNumber}`,
  };
  try {
    const message = await client.messages.create(messageOptions);
    return {
      messageId: message.sid,
      status: message.status,
      to: message.to,
    };
  } catch (error) {
    console.error('Twilio WhatsApp Error:', {
      message: error.message,
      code: error.code,
      moreInfo: error.moreInfo,
    });
    if (error.code === 63003) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Recipient has not joined the Twilio WhatsApp sandbox',
        'المستلم لم ينضم بعد إلى صندوق واتساب التجريبي'
      );
    }
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to send OTP via WhatsApp',
      'فشل إرسال رمز التحقق عبر واتساب'
    );
  }
};


/**
 * Generate OTP for phone verification
 * @param {string} phone
 * @returns {Promise<void>}
 */
const generatePhoneOtpToken = async (phone) => {
  const otp = Math.floor(100000 + Math.random() * 900000); // Generate a 6-digit OTP
  const expires = moment().add(10, 'minutes'); // OTP expires in 10 minutes
  const otpToken = generateToken(phone, expires, tokenTypes.PHONE_OTP, config.jwt.secret);

  // Save OTP and token to the database
  await saveToken(otpToken, null, expires, tokenTypes.PHONE_OTP, false, otp, phone);

  // Send OTP via WhatsApp
  await sendOtpViaWhatsApp(phone, otp);
};

const verifyPhoneOtp = async (phone, otp) => {
  const tokenDoc = await Token.findOne({ otp, blacklisted: false, phone });
  if (!tokenDoc || moment().isAfter(tokenDoc.expires)) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired OTP', 'رمز OTP غير صالح أو منتهي الصلاحية');
  }

  return tokenDoc;
};

const regesterValidateOtp = async (token, phone) => {
  const tokenDoc = await Token.findOne({ token, blacklisted: false, phone });
  if (!tokenDoc || moment().isAfter(token.expires)) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired OTP', 'رمز OTP غير صالح أو منتهي الصلاحية');
  }
  return tokenDoc;
};

const removeToken = async (tokenID = null) => {
  if (tokenID) {
    await Token.deleteOne({
      _id: tokenID,
    });
  }
};

module.exports = {
  generateToken,
  saveToken,
  verifyToken,
  generateAuthTokens,
  generateAccessToken,
  generateResetPasswordToken,
  generateVerifyEmailToken,
  generatePhoneOtpToken,
  sendOtpViaWhatsApp,
  verifyPhoneOtp,
  regesterValidateOtp,
  removeToken,
  deleteTokens,
};
