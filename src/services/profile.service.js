// services/profile.service.js

const httpStatus = require('http-status');
const moment = require('moment');
const Profile = require('../models/profile.model');
const User = require('../models/user.model');
const ApiError = require('../utils/ApiError');
// const { formatUserModel } = require('../utils/formatter');
const UserCreditTransaction = require('../models/extra/userCreditTransaction.model');
const ProfileVisitor = require('../models/extra/profileVisitor.model');
const logger = require('../config/logger');
const { userProjection } = require('./user.service');
const { getProPricing, getVipPricing } = require('../config/pricing');
const userService = require('./user.service');
const GiftTransaction = require('../models/extra/giftTransaction.model');
const { calculatePagination } = require('../utils/pagination');
const mongoose = require('mongoose');



const userProfileSelect = `
  _id userId name avatar frame wing isMale isHost isAgencyHost isSuperAdmin isCustomerService credits level famePoints richPoints
  chargeLevel countryCode creditAgency currentRoom dateOfBirth hostAgency host pro vip
`.replace(/\s+/g, ' ');
/**
 * Get a user's main profile by userId
 * @param {ObjectId} userId
 * @returns {Promise<Profile>}
 */

/**
 *
 * @param {*} visitedUserId
 * @param {*} visitorUserId
 * @returns
 */

// const logProfileVisit = async (visitedUserId, visitorUserId) => {
//   try {
//     // Check if there's already a visit record for today and increment amount
//     const visit = await ProfileVisitor.findOneAndUpdate(
//       { visitedUserId, visitorUserId },
//       {
//         visitedUserId,
//         visitorUserId,
//         $inc: { amount: 1 }, // Increment amount by 1
//         visitedDate: new Date(),
//         isRead: false,
//       },
//       {
//         upsert: true,
//         new: true,
//         setDefaultsOnInsert: true, // This ensures amount is set to 1 on first insert
//       }
//     );

//     logger.info('Profile visit logged: %o', {
//       visitedUserId,
//       visitorUserId,
//       visitedDate: visit.updatedAt,
//     });

//     return visit;
//   } catch (err) {
//     logger.error('Error logging profile visit:', err);
//   }
// };

const logProfileVisit = async (visitedUserId, visitorUserId) => {
  try {

    const visit = await ProfileVisitor.findOneAndUpdate(
      { visitedUserId, visitorUserId },
      {
        $inc: { amount: 1 },          // Handles both first visit & next visits
        $set: {
          visitedDate: new Date(),
          isRead: false
        },
        $setOnInsert: {
          visitedUserId,
          visitorUserId
        }
      },
      {
        upsert: true,
        new: true
      }
    );

    logger.info("Profile visit logged", {
      visitedUserId,
      visitorUserId,
      visitedDate: visit.visitedDate,
      amount: visit.amount
    });

    return visit;

  } catch (err) {
    logger.error("Error logging profile visit:", err);
    throw err;
  }
};


/**
 *
 * @param {*} visitedUserId
 * @param {*} pagee
 * @param {*} limite
 * @returns
 */

// const getProfileVisitors = async (visitedUserId, pagee = 1, limite = 10) => {
//   try {
//     // Ensure page and limit are valid integers
//     const page = Math.max(1, parseInt(pagee, 10)); // Default to 1 if invalid
//     const limit = Math.min(Math.max(1, parseInt(limite || 10, 10)), 30); // Default to 10, max 30
//     // Calculate the number of documents to skip for pagination
//     const skip = (page - 1) * limit;
//     // Fetch the profile visitors with pagination, sorting by the latest visit
//     const visitors = await ProfileVisitor.find({ visitedUserId })
//       .select('visitorUserId visitedDate isRead -_id amount') // Select only the visitor user ID and visited date
//       .sort({ visitedDate: -1 }) // Sort by `visitedDate` in descending order (latest first)
//       .skip(skip) // Skip documents for pagination
//       .limit(Math.min(limit, 30 - skip)) // Ensure we never return more than 30 total results
//       .populate('visitorUserId', userProjection) // Populate the visitor user details
//       .exec();
//     // Transform visitors to handle deleted users
//     const transformedVisitors = userService.transformDeletedUsers(visitors, 'visitorUserId');
//     // Get the total count of profile visitors (for pagination metadata)
//     const totalVisitors = await ProfileVisitor.countDocuments({
//       visitedUserId,
//     });
//     // Cap total results at 30
//     const cappedTotal = Math.min(totalVisitors, 30);
//     // mark all as read
//     await ProfileVisitor.updateMany({ visitedUserId, isRead: false }, { isRead: true });
//     const totalPages = Math.ceil(cappedTotal / limit);
//     return {
//       list: transformedVisitors || [],
//       page,
//       limit,
//       totalPages,
//       nextPage: page < totalPages ? page + 1 : null,
//       total: cappedTotal,
//     };
//   } catch (err) {
//     console.error('Error fetching profile visitors:', err);
//     throw err;
//   }
// };

const getProfileVisitors = async (visitedUserId, pagee = 1, limite = 10) => {
  try {
    const page = Math.max(1, parseInt(pagee, 10));
    const limit = Math.min(Math.max(1, parseInt(limite || 10, 10)), 30);
    const skip = (page - 1) * limit;

    const visitedId =
      typeof visitedUserId === "string"
        ? new mongoose.Types.ObjectId(visitedUserId)
        : visitedUserId;

    const visitors = await ProfileVisitor.find({ visitedUserId: visitedId })
      .sort({ visitedDate: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "visitorUserId",
        select: userProjection,
        model: "User",
      })
      .lean();

    const transformedVisitors = userService.transformDeletedUsers(
      visitors,
      "visitorUserId"
    );

    const total = await ProfileVisitor.countDocuments({
      visitedUserId: visitedId,
    });

    await ProfileVisitor.updateMany(
      { visitedUserId: visitedId, isRead: false },
      { isRead: true }
    );

    const totalPages = Math.ceil(total / limit);

    return {
      list:
        transformedVisitors.map((v) => ({
          visitorUserId: v.visitorUserId,
          visitedDate: v.visitedDate,
          isRead: v.isRead,
          amount: v.amount,
        })) || [],
      page,
      limit,
      totalPages,
      nextPage: page < totalPages ? page + 1 : null,
      total,
    };
  } catch (err) {
    console.error("Error fetching profile visitors:", err);
    throw err;
  }
};



const getUnreadProfileVisitorsCount = async (visitedUserId) => {
  // Count the number of unread profile visitors
  const unreadCount = await ProfileVisitor.countDocuments({
    visitedUserId,
    isRead: false,
  });
  logger.info('Unread profile visitors count:', { unreadCount });
  return unreadCount || 0;
};

const getPublicProfileByUserId = async (userId) => {
  const profile = await Profile.findOne({ user: userId }).select('info');
  const user = await User.findById(userId)
    .select(`${userProfileSelect} friendsCount followersCount followingCount group createdAt totalChargedAmount`)
    .populate('group', 'name');
  console.info('getPublicProfileByUserId', userId, profile, user);
  if (!profile) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Profile not found', 'الملف الشخصي غير موجود');
  }

  return { profile, user };
};

const getCreditsHistory = async (userId, page = 1, limit = 10) => {
  // Get current date
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Calculate start date: first day of current month
  const match = { user: userId, createdAt: { $gte: new Date(currentYear, currentMonth, 1) } };
  const startDate = new Date(currentYear, currentMonth, 1);

  const history = await UserCreditTransaction.find({
    user: userId,
    createdAt: {
      $gte: startDate
    }
  })
    .select('-_id amount type description descriptionAr createdAt')
    .sort({
      createdAt: -1,
    })
    .limit(limit)
    .skip((page - 1) * limit)
    .lean();

  const totalCount = await UserCreditTransaction.countDocuments(match);


  const pagination = calculatePagination(totalCount, page, limit);
  return { list: history, ...pagination };
};

const getUserLevel = async (userId) => {
  const user = await User.findById(userId).select('level');
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Profile not found', 'الملف الشخصي غير موجود');
  }
  console.info('user level', user.level);
  return user.level;
};
/**
 * Get private profile (current user) by user ID
 * @param {ObjectId} userId
 * @param id
 * @returns {Promise<Profile>}
 */
const getUserProfileByUserId = async (id) => {
  const profile = await Profile.findOne({ user: id }).populate('user');

  if (!profile) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Profile not found', 'الملف الشخصي غير موجود');
  }

  return profile;
};

/**
 * Add a user to an agency's user list
 * @param {ObjectId} userId
 * @param {object} userDetails
 * @returns {Promise<Profile>}
 */

const addImageToAlbum = async (userId, images) => {
  console.log('images', images);
  const profile = await Profile.findOne({ user: userId });
  if (!profile) throw new ApiError(httpStatus.NOT_FOUND, 'Profile not found', 'الملف الشخصي غير موجود');
  let { album } = profile.info;

  if (album.length === 0) {
    album = ['', '', '', '', '', ''];
  }
  images.forEach((image) => {
    album[image.index] = image.image;
  });
  for (let i = 0; i < album.length; i += 1) {
    if (!album[i]) album[i] = '';
  }
  // replace null values with empty strings
  album.forEach((image, index) => {
    if (!image) album[index] = '';
  });
  console.log('album', album);
  profile.info.album = album;
  console.log('profile', profile.info.album);

  await Profile.findOneAndUpdate({ user: userId }, { 'info.album': profile.info.album });

  return album;
};

// Delete image from album
const deleteImageFromAlbum = async (userId, imageUrl) => {
  //   set the image to '' in the album
  const profile = await Profile.findOne({ user: userId });
  if (!profile) throw new ApiError(httpStatus.NOT_FOUND, 'Profile not found', 'الملف الشخصي غير موجود');
  const { album } = profile.info;
  const index = album.indexOf(imageUrl);
  if (index === -1) throw new ApiError(httpStatus.NOT_FOUND, 'Image not found', 'الصورة غير موجودة');
  album[index] = '';
  await Profile.findOneAndUpdate({ user: userId }, { 'info.album': album });
  return album;
};

// Sort album images
const sortAlbum = async (userId, sortedAlbum) => {
  const profile = await Profile.findOneAndUpdate(
    { user: userId },
    { 'info.album': sortedAlbum }, // Update the album with sorted image URLs
    { new: true }
  );
  if (!profile) throw new ApiError(httpStatus.NOT_FOUND, 'Profile not found', 'الملف الشخصي غير موجود');
  return profile;
};
const updateInterests = async (userId, interests) => {
  console.log('interests', interests);
  const profile = await Profile.findOneAndUpdate({ user: userId }, { 'info.interests': interests }, { new: true });
  if (!profile) throw new ApiError(httpStatus.NOT_FOUND, 'Profile not found', 'الملف الشخصي غير موجود');
  return profile;
};

const checkLimitGenderChanges = async (userId, newGender) => {
  const user = await User.findById(userId).select('lastGenderChangeDate isMale');

  if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');

  // no change (same gender)
  if (user.isMale === newGender) return;

  // if user never changed gender before → allow the first change
  if (!user.lastGenderChangeDate) {
    user.lastGenderChangeDate = new Date();
    await user.save();
    return;
  }

  // user changed gender before → BLOCK
  throw new ApiError(
    httpStatus.BAD_REQUEST,
    'You can only change your gender once',
    'يمكنك تغيير جنسك مرة واحدة'
  );
};


// const checkLimitGenderChanges = async (userId, isMale) => {
//   return; // Temporarily disabled
//   // TODO: remove return when ready to enable
//   const user = await User.findById(userId).select('lastGenderChangeDate isMale');
//   if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
//   if (user.isMale === isMale) {
//     console.log('No change in gender');
//     return; // No change in
//   }
//   if (!user.lastGenderChangeDate) {
//     console.log('First time changing gender');
//     user.lastGenderChangeDate = new Date();
//     await user.save();
//     return; // No previous change, allow
//   }
//   console.log('Last gender change was on', user.lastGenderChangeDate);
//   throw new ApiError(httpStatus.BAD_REQUEST, 'You can only change your gender once', 'يمكنك تغيير جنسك مرة واحدة');
// };

// Edit profile info
// const editProfile = async (userId, profileData) => {
//   const updatedUser = await User.findByIdAndUpdate(
//     userId,
//     {
//       ...profileData,
//     },
//     { new: true }
//   );
//   if (!updatedUser) throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
//   return updatedUser;
// };

const editProfile = async (userId, profileData) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');

  // assign fields
  Object.assign(user, profileData);

  await user.save();
  return user;
};


// Upload avatar
const uploadAvatar = async (userId, avatarUrl) => {
  const updatedUser = await User.findByIdAndUpdate(userId, { avatar: avatarUrl }, { new: true });
  if (!updatedUser) throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  return updatedUser;
};
const updateAbout = async (userId, aboutData) => {
  const profile = await Profile.findOneAndUpdate({ user: userId }, { 'info.about': aboutData }, { new: true });
  if (!profile) throw new ApiError(httpStatus.NOT_FOUND, 'Profile not found', 'الملف الشخصي غير موجود');
  return profile;
};
const vipSubscribed = async (userId, level, expirationDate, price, fromAdmin = false) => {
  const message = `VIP Subscription - Level ${level}`;
  const messageAr = `اشتراك VIP - المستوى ${level}`;

  // Deduct the user's balance only if not from admin
  if (!fromAdmin) {
    await userService.deductUserBalance(userId, price, message, messageAr);
  }

  // Update the user's VIP level and expiration date in the User model
  await User.findByIdAndUpdate(userId, {
    'vip.level': level,
    'vip.expirationDate': expirationDate,
  });

  // Assign VIP special ID
  try {
    const specialIdService = require('../models/userSpecialId.model');
    const durationInDays = Math.ceil((new Date(expirationDate) - new Date()) / (1000 * 60 * 60 * 24));
    // await specialIdService.generateForVipUser(userId, level, durationInDays);
    const storeService = require('./store.service');
    await storeService.giveVipItems(userId, level, durationInDays);
    // send socket event to all users

  } catch (error) {
    // Log error but don't fail VIP subscription if special ID assignment fails
    const logger = require('../config/logger');
    logger.warn(`Failed to generate VIP special ID for user ${userId}, VIP level ${level}: ${error.message}`);
  }

  return { level, expirationDate };
};

const getVipLevel = async (userId) => {
  const user = await User.findById(userId).select('vip');
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }
  const DateNow = moment();
  if (user.vip.expirationDate < DateNow && user.vip.level !== 0) {
    await User.findByIdAndUpdate(userId, {
      'vip.level': 0,
      'vip.expirationDate': null,
    });
    return { level: 0, expirationDate: null };
  }

  const vip = {
    level: user.vip.level || 0,
    expirationDate: user.vip.expirationDate || null,
  };
  return vip;
};

const isVip = async (userId) => {
  const user = await User.findById(userId).select('vip');
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }
  const level = user.vip.level || 0;
  if (level === 0) return false;
  const expirationDate = user.vip.expirationDate || null;
  if (expirationDate && moment(expirationDate).isAfter(moment())) {
    return level;
  }
  return false;
};

const checkVipLevel = async (userId, level) => {
  const userVip = await getVipLevel(userId);
  if (userVip.level < level || moment(userVip.expirationDate).isBefore(moment())) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `You need to be at least VIP level ${level}`,
      `يجب أن تكون على الأقل مستوى VIP ${level}`
    );
  }
  return userVip;
};

const proSubscribed = async (userId, expirationDate, price, free) => {
  const message = 'Pro Subscription';
  const messageAr = 'اشتراك Pro';

  // Deduct the user's balance
  if (!free) {
    await userService.deductUserBalance(userId, price, message, messageAr);
  }

  // Update the user's Pro expiration date in the User model
  await User.findByIdAndUpdate(userId, { 'pro.expirationDate': expirationDate });

  logger.info(`User ${userId} subscribed to Pro until ${expirationDate}`);

  return { expirationDate };
};
const getPro = async (userId) => {
  const user = await User.findById(userId).select('pro');
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }
  const DateNow = moment();
  if (user.pro.expirationDate && user.pro.expirationDate < DateNow) {
    await User.findByIdAndUpdate(userId, { 'pro.expirationDate': null });
    return { expirationDate: null };
  }
  const pro = {
    expirationDate: user.pro.expirationDate || null,
  };
  return pro;
};
const checkProValidity = async (pro) => {
  if (!pro || !pro.expirationDate) {
    return false;
  }
  const now = moment();
  if (moment(pro.expirationDate).isBefore(now)) {
    // Pro subscription has expired
    return false;
  }
  // Pro subscription is still valid
  return true;
};
const subscribePro = async (userId, months = 1, free = false) => {
  const userPro = await getPro(userId);
  const now = moment();
  const pricingConfig = await getProPricing();
  const price = pricingConfig[months] || 0;

  if (!price && !free) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid subscription period', 'فترة اشتراك غير صالحة');
  }

  let expirationDate;
  if (userPro.expirationDate && moment(userPro.expirationDate).isAfter(now)) {
    const currentExpirationDate = moment(userPro.expirationDate);
    expirationDate = currentExpirationDate.add(months, 'months').toDate();
  } else {
    expirationDate = now.add(months, 'months').toDate();
  }

  await proSubscribed(userId, expirationDate, price, free);
  return { expirationDate };
};

const subscribeVip = async (userId, level = 1, days = 7, free = false) => {
  const userVip = await getVipLevel(userId);
  const now = moment();
  const vipPricingConfig = await getVipPricing();
  const price = vipPricingConfig[level] && vipPricingConfig[level][days] ? vipPricingConfig[level][days] : 0;

  if (!price && !free) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid subscription level', 'مستوى اشتراك غير صالح');
  }

  if (userVip.level > level) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'You have already subscribed to a higher level',
      'لقد اشتركت بالفعل في مستوى أعلى'
    );
  }

  let expirationDate;
  if (userVip.level === level) {
    const currentExpirationDate = userVip.expirationDate ? moment(userVip.expirationDate) : now;
    expirationDate = currentExpirationDate.add(days, 'days').toDate();
  } else {
    expirationDate = now.add(days, 'days').toDate();
  }

  await vipSubscribed(userId, level, expirationDate, price, free);
  return { level, expirationDate, prevVipLevel: userVip.level };
};

const isPro = async (userId) => {
  const user = await User.findById(userId).select('pro');
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }
  return user.pro.expirationDate && moment(user.pro.expirationDate).isAfter(moment());
};


const checkProAccess = async (userId) => {
  const userPro = await getPro(userId);
  if (!userPro.expirationDate || moment(userPro.expirationDate).isBefore(moment())) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'You need to be a Pro user', 'يجب أن تكون مستخدم Pro');
  }
  return userPro;
};

const getMiniProfile = async function (userId) {
  const gifts = await GiftTransaction.getGiftStatsForUser(userId);
  const user = await User.findById(userId).select('richPoints famePoints createdAt totalChargedAmount');
  const date = new Date();
  const badgesData = {
    richPoints: user.richPoints || 0,
    famePoints: user.famePoints || 0,
    registeredDays: Math.floor((date - user.createdAt) / (1000 * 60 * 60 * 24)) || 0,
    totalChargedAmount: user.totalChargedAmount || 0,
  };
  return { gifts, badgesData };
};
module.exports = {
  getUserProfileByUserId,
  getPublicProfileByUserId,
  getVipLevel,
  getPro,
  addImageToAlbum,
  deleteImageFromAlbum,
  sortAlbum,
  updateInterests,
  editProfile,
  uploadAvatar,
  updateAbout,
  getUserLevel,
  getCreditsHistory,
  logProfileVisit,
  getProfileVisitors,
  subscribeVip,
  vipSubscribed,
  subscribePro,
  checkVipLevel,
  getUnreadProfileVisitorsCount,
  isPro,
  isVip,
  checkProAccess,
  getMiniProfile,
  checkProValidity,
  checkLimitGenderChanges,
};
