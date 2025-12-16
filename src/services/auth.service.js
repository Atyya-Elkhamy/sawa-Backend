const httpStatus = require('http-status');
const axios = require('axios');
const tokenService = require('./token.service');
const userService = require('./user.service');
const Token = require('../models/auth/token.model');
const ApiError = require('../utils/ApiError');
const { tokenTypes } = require('../config/tokens');
const logger = require('../config/logger');
const DeviceToken = require('../models/auth/deviceToken.model');
const { compareAttributes } = require('../utils/compareAttributes');
/**
 * Login with phone, password, and device attributes
 * @param {string} phone
 * @param {string} password
 * @param {object} deviceAttributes - { hardware, system, app }
 * @returns {Promise<User>}
 */

const loginUserWithPhoneAndPassword = async (phone, password, body) => {
  const user = await userService.getUserByPhone(phone);
  if (!user || !(await user.isPasswordMatch(password))) {
    throw new ApiError(
      httpStatus.UNAUTHORIZED,
      'Incorrect phone or password',
      'رقم الهاتف أو كلمة المرور غير صحيحة'
    );
  }
  // Cancel deletion if user logs in during grace period
  await cancelAccountDeletion(user.id);
  // Extract attributes properly
  const { deviceToken, attributes } = body;
  if (!deviceToken) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Device token required', 'رمز الجهاز مطلوب');
  }
  const deviceRecord = await DeviceToken.findOne({ user: user._id, token: deviceToken });
  if (!deviceRecord) {
    throw new ApiError(
      httpStatus.UNAUTHORIZED,
      'No device record found for this user',
      'لا يوجد سجل جهاز لهذا المستخدم'
    );
  }
  const storedAttributes = deviceRecord.attributes || {};
  const currentDeviceAttributes = {
    hardware: attributes?.hardware || {},
    system: attributes?.system || {},
    app: attributes?.app || {},
  };
  const comparison = compareAttributes(storedAttributes, currentDeviceAttributes);
  console.log('Device comparison result:', comparison);
  if (!comparison.passed) {
    throw new ApiError(
      httpStatus.UNAUTHORIZED,
      `Device mismatch: score ${comparison.overallScore}`,
      `الجهاز الحالي غير مطابق (درجة التطابق ${comparison.overallScore}%)`
    );
  }
  return user;
};


// check device token belongs to user and not blacklisted

/**
 * Logout
 * @param {string} refreshToken
 * @returns {Promise}
 */
const logout = async (refreshToken) => {
  const refreshTokenDoc = await Token.findOne({
    token: refreshToken,
    type: tokenTypes.REFRESH,
  });
  if (!refreshTokenDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, 'user not logged in', 'المستخدم غير مسجل الدخول');
  }
  await refreshTokenDoc.deleteOne();
};

/**
 * Refresh auth tokens
 * @param {string} refreshToken
 * @returns {Promise<object>}
 */
const refreshAuth = async (refreshToken) => {
  try {
    const refreshTokenDoc = await tokenService.verifyToken(refreshToken, tokenTypes.REFRESH);
    const user = await userService.getUserById(refreshTokenDoc.user);
    if (!user) {
      throw new Error();
    }
    logger.info('user %o', user);

    await refreshTokenDoc.deleteOne();
    return tokenService.generateAuthTokens(user, '', '', true);
  } catch (error) {
    logger.error(error);
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate', 'الرجاء قم بتسجيل الدخول');
  }
};

/**
 * Reset password
 * @param {string} resetPasswordToken
 * @param {string} newPassword
 * @returns {Promise}
 */
const resetPassword = async (resetPasswordToken, newPassword) => {
  try {
    const resetPasswordTokenDoc = await tokenService.verifyToken(resetPasswordToken, tokenTypes.RESET_PASSWORD);
    const user = await userService.getUserById(resetPasswordTokenDoc.user);
    if (!user) {
      throw new Error();
    }
    await userService.updateUserById(user.id, { password: newPassword });
    await Token.deleteMany({ user: user.id, type: tokenTypes.RESET_PASSWORD });
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Password reset failed', 'فشل إعادة تعيين كلمة المرور');
  }
};
const changePassword = async (userId, oldPassword, newPassword) => {
  const user = await userService.getUserById(userId);
  if (!user || !(await user.isPasswordMatch(oldPassword))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect password', 'كلمة المرور غير صحيحة');
  }
  await userService.updateUserById(userId, { password: newPassword });
};

/**
 * Verify email
 * @param {string} verifyEmailToken
 * @returns {Promise}
 */
const verifyEmail = async (verifyEmailToken) => {
  try {
    const verifyEmailTokenDoc = await tokenService.verifyToken(verifyEmailToken, tokenTypes.VERIFY_EMAIL);
    const user = await userService.getUserById(verifyEmailTokenDoc.user);
    if (!user) {
      throw new Error();
    }
    await Token.deleteMany({ user: user.id, type: tokenTypes.VERIFY_EMAIL });
    await userService.updateUserById(user.id, { isEmailVerified: true });
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Email verification failed', 'فشل التحقق من البريد الإلكتروني');
  }
};

/**
 * Generate and send OTP for phone verification
 * @param {string} phone
 * @returns {Promise<void>}
 */
const sendPhoneOtp = async (phone) => {
  await tokenService.generatePhoneOtpToken(phone);
};

/**
 * Verify phone OTP
 * @param {string} phoneOtpToken
 * @param {string} otp
 * @returns {Promise<void>}
 */
const verifyPhoneOtp = async (phoneOtpToken, otp) => {
  try {
    const phoneOtpTokenDoc = await tokenService.verifyToken(phoneOtpToken, tokenTypes.PHONE_OTP);
    const user = await userService.getUserById(phoneOtpTokenDoc.user);
    if (!user) {
      throw new Error();
    }
    if (otp !== phoneOtpTokenDoc.otp) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid OTP', 'رمز التحقق غير صحيح');
    }
    await Token.deleteMany({ user: user.id, type: tokenTypes.PHONE_OTP });
    await userService.updateUserById(user.id, { isPhoneVerified: true });
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Phone verification failed', 'فشل التحقق من الهاتف');
  }
};

const deleteAccount = async (userId, password) => {
  const user = await userService.getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }
  // if user is facebook or google user, delete the account
  if (user.password) {
    if (!(await user.isPasswordMatch(password))) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect password', 'كلمة المرور غير صحيحة');
    }
  }
  // Instead of immediate deletion, schedule deletion for 7 days from now
  const now = new Date();
  const scheduledDeletion = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  const updated = await userService.updateUserById(user.id, {
    deletionRequest: {
      submittedAt: now,
      scheduledAt: scheduledDeletion,
      isActive: true,
    },
  });
  if (!updated) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Error scheduling account deletion', 'خطأ في جدولة حذف الحساب');
  }
  return updated;
};

/**
 * Cancel account deletion if user logs in during the grace period
 * @param {string} userId
 * @returns {Promise<User>}
 */
const cancelAccountDeletion = async (userId) => {
  const user = await userService.getUserById(userId);
  if (!user) {
    return null; // User not found, nothing to cancel
  }
  // Check if there's an active deletion request
  if (user.deletionRequest && user.deletionRequest.isActive) {
    const updated = await userService.updateUserById(userId, {
      deletionRequest: {
        submittedAt: null,
        scheduledAt: null,
        isActive: false,
      },
    });
    return updated;
  }

  return user;
};

/**
 *
 * @param accessToken
 */
async function getGoogleUserProfile(accessToken) {
  try {
    const response = await axios.get('https://people.googleapis.com/v1/people/me', {
      params: {
        personFields: 'birthdays,genders,names,emailAddresses',
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    const profile = response.data;
    const name = profile.names?.[0]?.displayName || null;
    const email = profile.emailAddresses?.[0]?.value || '';
    const birthdate = profile.birthdays?.[0]?.date;
    const gender = profile.genders?.[0]?.value || null;
    const avatar = profile.photos?.[0]?.url || null;
    let formattedBirthdate = null;
    if (birthdate) {
      formattedBirthdate = `${birthdate.year}-${String(birthdate.month).padStart(2, '0')}-${String(birthdate.day).padStart(
        2,
        '0'
      )}`;
    }
    const resourceName = profile.resourceName || null; // Extract the google id from resourceName
    // get the google id from the resourceName without the people/ prefix
    const googleIdParts = resourceName.split('/');
    const googleId = googleIdParts[googleIdParts.length - 1];
    if (!googleId) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Login failed", "فشل تسجيل الدخول");
    }
    return {
      name,
      email,
      birthdate: formattedBirthdate,
      isMale: gender === 'male' || gender === 'Male' || gender === 'M' || gender === 'm',
      avatar,
      googleId,
    };
  } catch (error) {
    console.error('Error fetching user profile:', error.response ? error.response.data : error.message);
    // Handle error appropriately
    throw new ApiError(httpStatus.UNAUTHORIZED, "Login failed", "فشل تسجيل الدخول");
  }
}

module.exports = {
  loginUserWithPhoneAndPassword,
  logout,
  refreshAuth,
  resetPassword,
  verifyEmail,
  sendPhoneOtp,
  verifyPhoneOtp,
  deleteAccount,
  cancelAccountDeletion,
  changePassword,
  getGoogleUserProfile,
};
