const axios = require('axios');
const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { authService, tokenService, emailService } = require('../services');
const userService = require('../services/user.service');
const DeviceToken = require('../models/auth/deviceToken.model');
const User = require('../models/user.model');
const { loginFormatter } = require('../utils/formatter');
const { recordAchievement } = require('../services/extra/achievement.service');
const ApiError = require('../utils/ApiError');
const { Profile } = require('../models');
const { deviceTokenTypes } = require('../models/auth/deviceToken.model');
const { userRoomSelection } = require('../services/user.service');
const { compareAttributes } = require('../utils/compareAttributes');

const register = catchAsync(async (req, res) => {
  const { token, phone } = req.body;
  // find the token
  console.log("the req body issssss:", req.body);
  const tokenDoc = await tokenService.regesterValidateOtp(token, phone);
  if (!tokenDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Token not found', 'الرمز غير موجود');
  }
  const userBody = req.body;
  if (req.file) {
    userBody.avatar = req.file.location;
  }
  userBody.isMale = req.body.gender === 'male';

  const tokenExists = await DeviceToken.isTokenTaken(userBody.deviceToken, deviceTokenTypes.PHONE);
  if (tokenExists) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Tobken already exists', 'الجهاز مسجل بالفعل ');
  }
  if (await User.findOne({ phone: userBody.phone })) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Phone number already exists', 'رقم الهاتف موجود بالفعل ');
  }
  await userService.createUser(userBody, deviceTokenTypes.PHONE);
  // await tokenService.removeToken(tokenDoc._id);
  res.status(httpStatus.CREATED).send({
    message: 'User registered successfully',
    messageAr: 'تم تسجيل المستخدم بنجاح',
  });
});

const facebookAuth = catchAsync(async (req, res) => {
  const { accessToken } = req.body;
  console.log(accessToken);
  // Verify the access token with Facebook
  const facebookResponse = await axios.get(
    `https://graph.facebook.com/me?access_token=${accessToken}&fields=id,name,email,picture,birthday,gender`
  );
  const { id: sub, name, email, picture: avatar, gender, birthday } = facebookResponse.data;
  // Find or create the user
  let user = await User.findOne({ facebookId: sub }).populate('room', userRoomSelection);
  if (!user) {
    user = await userService.createUser(
      {
        facebookId: sub,
        name,
        email,
        avatar: avatar.data.url,
        deviceToken: req.body.deviceToken,
        countryCode: req.body.countryCode,
        isMale: gender === 'male',
        dateOfBirth: new Date(birthday),
        provider: deviceTokenTypes.FACEBOOK,
      },
      deviceTokenTypes.FACEBOOK
    );
  } else {
    // Cancel account deletion if user logs in during grace period
    await authService.cancelAccountDeletion(user.id);
  }
  const LoginModel = loginFormatter(user);
  const tokens = await tokenService.generateAuthTokens(user, req.body.deviceToken, deviceTokenTypes.FACEBOOK, false);
  res.status(httpStatus.OK).send({ ...LoginModel, tokens });
});

// const client = new OAuth2Client(config.google.clientId);



// const googleAuth = catchAsync(async (req, res) => {
//   console.log('googleAuth');
//   const { accessToken, attributes } = req.body;
//   //Verify the access token with Google
//   const userInfo = await authService.getGoogleUserProfile(accessToken);
//   const { googleId, name, email, picture: avatar, birthdate, isMale } = userInfo;
//   if (!googleId || !name) {
//     throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid user info', 'المعلومات الشخصية غير صالحة');
//   }
//   //Check if user exists
//   let user = await User.findOne({ googleId }).populate('room', userRoomSelection);
//   //If user exists, compare device attributes
//   if (user && user.attributes) {
//     const result = compareAttributes(user.attributes, attributes);
//     console.log('Device comparison result:', result);
//     if (!result.passed) {
//       throw new ApiError(
//         httpStatus.UNAUTHORIZED,
//         `Device verification failed. Score: ${result.overallScore}`,
//         'فشل التحقق من الجهاز، الرجاء المحاولة من نفس الجهاز أو التواصل مع الدعم'
//       );
//     }
//   }
//   //If user does not exist, create a new one
//   if (!user) {
//     // Before creation, you can still check the score if you have a baseline (optional)
//     user = await userService.createUser(
//       {
//         googleId,
//         name,
//         email,
//         avatar,
//         isMale,
//         attributes,
//         deviceToken: req.body.deviceToken,
//         countryCode: req.body.countryCode || 'EG',
//         provider: deviceTokenTypes.GOOGLE,
//         dateOfBirth: new Date(birthdate),
//       },
//       deviceTokenTypes.GOOGLE
//     );
//   } else {
//     //Cancel account deletion if user logs in during grace period
//     await authService.cancelAccountDeletion(user.id);
//   }
//   //Generate JWT tokens
//   const tokens = await tokenService.generateAuthTokens(
//     user,
//     req.body.deviceToken,
//     deviceTokenTypes.GOOGLE,
//     false
//   );
//   const LoginModel = loginFormatter(user);
//   res.status(httpStatus.OK).send({ ...LoginModel, tokens });
// });

const googleAuth = catchAsync(async (req, res) => {
  console.log('googleAuth');
  const { accessToken, attributes, deviceToken, countryCode } = req.body;
  if (!accessToken) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Missing access token', 'رمز الدخول مفقود');
  }
  const userInfo = await authService.getGoogleUserProfile(accessToken);
  if (!userInfo) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Failed to verify Google token', 'فشل في التحقق من رمز جوجل');
  }
  const { googleId, name, email, picture: avatar, birthdate, isMale } = userInfo;
  if (!googleId || !name) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid user info', 'المعلومات الشخصية غير صالحة');
  }
  let user = await User.findOne({ googleId }).populate('room', userRoomSelection);
  // Compare device if user exists
  if (user) {
    const existingDevice = await DeviceToken.findOne({
      user: user._id,
      type: deviceTokenTypes.GOOGLE,
    });
    if (existingDevice?.attributes && attributes) {
      const result = compareAttributes(existingDevice.attributes, attributes);
      console.log('Device comparison result:', result);

      if (!result.passed) {
        throw new ApiError(
          httpStatus.UNAUTHORIZED,
          `Device verification failed. Score: ${result.overallScore}`,
          'فشل التحقق من الجهاز، الرجاء المحاولة من نفس الجهاز أو التواصل مع الدعم'
        );
      }
    }
  }
  // Create new user if needed
  if (!user) {
    user = await userService.createUser(
      {
        googleId,
        name,
        email,
        avatar,
        isMale,
        attributes,
        deviceToken,
        countryCode: countryCode || 'EG',
        provider: deviceTokenTypes.GOOGLE,
        dateOfBirth: birthdate ? new Date(birthdate) : undefined,
      },
      deviceTokenTypes.GOOGLE
    );
  } else {
    await authService.cancelAccountDeletion(user.id);
  }
  const tokens = await tokenService.generateAuthTokens(
    user,
    deviceToken,
    deviceTokenTypes.GOOGLE,
    false
  );
  const loginModel = loginFormatter(user);
  res.status(httpStatus.OK).send({
    ...loginModel,
    tokens,
    message: 'Login successful',
    messageAr: 'تم تسجيل الدخول بنجاح',
  });
});


const login = catchAsync(async (req, res) => {
  const { phone, password, deviceToken } = req.body;
  const user = await authService.loginUserWithPhoneAndPassword(phone, password, req.body);
  const tokens = await tokenService.generateAuthTokens(
    user,
    deviceToken,
    deviceTokenTypes.PHONE,
    false
  );
  const LoginModel = loginFormatter(user);
  res.send({ ...LoginModel, tokens });
});


const logout = catchAsync(async (req, res) => {
  console.log('logging out');
  await userService.resetCacheDataForUser(req.user.id);
  await authService.logout(req.body.refreshToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const refreshTokens = catchAsync(async (req, res) => {
  const tokens = await authService.refreshAuth(req.body.refreshToken);
  res.send({ ...tokens });
});

const forgotPassword = catchAsync(async (req, res) => {
  const resetPasswordToken = await tokenService.generateResetPasswordToken(req.body.phone);
  await tokenService.sendOtpViaWhatsApp(req.body.phone, resetPasswordToken);
  res.status(httpStatus.OK).send({
    message: 'Reset password token sent successfully',
    messageAr: 'تم إرسال رمز إعادة تعيين كلمة المرور بنجاح',
  });
});

const resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.query.token, req.body.password);
  res.status(httpStatus.OK).send({
    message: 'Password reset successfully',
    messageAr: 'تم إعادة تعيين كلمة المرور بنجاح',
  });
});

const changePassword = catchAsync(async (req, res) => {
  await authService.changePassword(req.user.id, req.body.oldPassword, req.body.newPassword);
  res.status(httpStatus.OK).send({
    message: 'Password changed successfully',
    messageAr: 'تم تغيير كلمة المرور بنجاح',
  });
});

const sendVerificationEmail = catchAsync(async (req, res) => {
  const verifyEmailToken = await tokenService.generateVerifyEmailToken(req.user);
  await emailService.sendVerificationEmail(req.user.email, verifyEmailToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const verifyEmail = catchAsync(async (req, res) => {
  await authService.verifyEmail(req.query.token);
  res.status(httpStatus.NO_CONTENT).send();
});

const sendOtp = catchAsync(async (req, res) => {
  const { phone } = req.body;
  // Check if the phone number is already registered
  if (await User.findOne({ phone })) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Phone number already registered', 'رقم الهاتف مسجل بالفعل');
  }
  // Generate and send OTP
  await tokenService.generatePhoneOtpToken(phone);
  res.status(httpStatus.CREATED).send({
    messageAr: 'تم إرسال رمز التحقق بنجاح',
    message: 'OTP sent successfully',
  });
});

const verifyOtp = catchAsync(async (req, res) => {
  const { phone, otp } = req.body;

  // Verify the OTP
  const tokenDoc = await tokenService.verifyPhoneOtp(phone, otp);

  res.status(httpStatus.OK).send({
    message: 'OTP verified successfully',
    messageAr: 'تم التحقق من رمز التحقق بنجاح',
    token: tokenDoc.token,
  });
});

const dailyLogin = catchAsync(async (req, res) => {
  await recordAchievement(req.user.id, 'login');

  // Cancel account deletion if user logs in during grace period
  await authService.cancelAccountDeletion(req.user.id);

  // respond with login model
  const userData = await User.findById(req.user.id).populate('room', userRoomSelection);
  const tokens = await tokenService.generateAuthTokens(userData, 'deviceToken', deviceTokenTypes.PHONE, true);
  const LoginModel = loginFormatter(userData);
  res.status(httpStatus.OK).send({
    ...LoginModel,
    tokens,
  });
});
// deleted after 7 days of submission unless user logged in
const deleteUser = catchAsync(async (req, res) => {
  const { password } = req.body;

  await authService.deleteAccount(req.user.id, password);
  res.status(httpStatus.OK).send({
    message: 'Account deletion scheduled for 7 days. Login within 7 days to cancel.',
    messageAr: 'تم جدولة حذف الحساب خلال 7 أيام. قم بتسجيل الدخول خلال 7 أيام للإلغاء.',
  });
});

// Cancel scheduled account deletion
const cancelAccountDeletion = catchAsync(async (req, res) => {
  await authService.cancelAccountDeletion(req.user.id);
  res.status(httpStatus.OK).send({
    message: 'Account deletion cancelled successfully',
    messageAr: 'تم إلغاء حذف الحساب بنجاح',
  });
});

// Check if user has pending deletion request
const getDeletionStatus = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id).select('deletionRequest');

  if (user && user.deletionRequest && user.deletionRequest.isActive) {
    const daysRemaining = Math.ceil((new Date(user.deletionRequest.scheduledAt) - new Date()) / (1000 * 60 * 60 * 24));
    res.status(httpStatus.OK).send({
      hasPendingDeletion: true,
      scheduledAt: user.deletionRequest.scheduledAt,
      daysRemaining: Math.max(0, daysRemaining),
      message: 'Account is scheduled for deletion',
      messageAr: 'تم جدولة حذف الحساب',
    });
  } else {
    res.status(httpStatus.OK).send({
      hasPendingDeletion: false,
      message: 'No pending deletion request',
      messageAr: 'لا توجد طلبات حذف معلقة',
    });
  }
});

module.exports = {
  register,
  login,
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
  sendOtp,
  verifyOtp,
  facebookAuth,
  googleAuth,
  deleteUser,
  changePassword,
  dailyLogin,
  cancelAccountDeletion,
  getDeletionStatus,
};
