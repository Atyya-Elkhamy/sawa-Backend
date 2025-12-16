// controllers/profile.controller.js

const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
/**
 * @type {import('../services').ProfileService}
 */
const userService = require('../services/user.service');
const profileService = require('../services/profile.service');
const ApiError = require('../utils/ApiError');
const { ProfileUserFormatter } = require('../utils/formatter');
const { Contact, Profile, User, GiftTransaction } = require('../models');
const chargeService = require('../services/charge.service');
const levelService = require('../services/extra/level.service');
const storeService = require('../services/store.service');
const { userProjection } = require('../services/user.service');
const liveKitService = require('../services/room/live-kit.service');
const messageSender = require('../services/chat/messageSender');
/**
 * Get the current user's main profile
 */

const getUserProfile = catchAsync(async (req, res) => {
  const profile = await profileService.getUserProfileByUserId(req.user.id);
  if (!profile) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Profile not found', 'الملف الشخصي غير موجود');
  }
  const { user } = profile;
  const numberOfFriends = user.friendsCount;
  const numberOfFollowers = user.followersCount;
  const numberOfFollowing = user.followingCount;

  const data = {
    avatar: user.avatar,
    room: user.room,
    frame:
      user.frame?.expirationDate > new Date()
        ? user.frame
        : {
          url: null,
          expirationDate: user.frame.expirationDate,
        },
    name: user.name,
    userId: user.userId,
    id: user._id,
    countryCode: user.countryCode,
    friends: numberOfFriends,
    followers: numberOfFollowers,
    following: numberOfFollowing,
    level: user.level,
    chargeLevel: user.chargeLevel,
    credits: user.credits,
    vip: user.vip.level > 0 && user.vip.expirationDate > new Date() ? user.vip : null,
    isPro: user.pro.expirationDate > new Date(),
    chargeAgency: !!user.creditAgency,
    isHost: !!user.host,
    isAgencyHost: !!user.isAgencyHost,
  };
  res.status(httpStatus.OK).send(data);
});



// Public Profile Controllers

// Get another user's public profile by userId

const getPublicProfile = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { profile, user } = await profileService.getPublicProfileByUserId(req.params.userId);
  if (!profile) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }
  if (req.params.userId !== userId) {
    console.log('check');
    const isPro = await profileService.isPro(userId);
    if (!isPro) {
      console.log('add visit');
      await profileService.logProfileVisit(req.params.userId, req.user.id);
    }
  }
  const gifts = await GiftTransaction.getGiftStatsForUser(req.params.userId);
  const userData = ProfileUserFormatter(user);
  const isFollowing = await userService.isFollowing(userId, req.params.userId);
  const isBlocked = await userService.isBlocked(userId, req.params.userId);

  res.status(httpStatus.OK).send({
    user: userData,
    info: profile.info,
    gifts,
    isFollowing,
    isBlocked,
  });
});

// Get another user's mini profile by userId
const getMiniProfile = catchAsync(async (req, res) => {
  const { user } = await profileService.getPublicProfileByUserId(req.params.userId);

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }
  const userData = ProfileUserFormatter(user);

  const gifts = await GiftTransaction.getGiftStatsForUser(req.params.userId);
  const isFollowing = await userService.isFollowing(req.user.id, req.params.userId);
  const isBlocked = await userService.isBlocked(req.user.id, req.params.userId);
  const isFriend = await userService.isFriend(req.user.id, req.params.userId);
  const vip = user.vip?.level > 0 && user.vip?.expirationDate > new Date() ? user.vip : null;
  const vipLevel = vip ? vip?.level : 0;
  userData.vipLevel = vipLevel;
  const date = new Date();
  const badgesData = {
    richPoints: user.richPoints || 0,
    famePoints: user.famePoints || 0,
    registeredDays: Math.floor((date - user.createdAt) / (1000 * 60 * 60 * 24)) || 0,
    totalChargedAmount: user.totalChargedAmount || 0,
  };
  res.status(httpStatus.OK).send({
    gifts,
    user: userData,
    isFriend,
    isFollowing,
    isBlocked,
    badgesData,
  });
});

const getProfileVisitors = catchAsync(async (req, res) => {
  const userId = req.user.id;
  await profileService.checkProAccess(userId);

  const visitors = await profileService.getProfileVisitors(req.user.id, req.query.page, req.query.limit);
  res.status(httpStatus.OK).send(visitors);
});

const getGiftWall = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }
  const gifts = await GiftTransaction.getGiftSummaryForUser(req.params.userId);
  res.status(httpStatus.OK).send(gifts);
});
const getBadgeWall = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.userId).select('richPoints famePoints createdAt totalChargedAmount');
  const date = new Date();
  const badgesData = {
    richPoints: user.richPoints || 0,
    famePoints: user.famePoints || 0,
    registeredDays: Math.floor((date - user.createdAt) / (1000 * 60 * 60 * 24)) || 0,
    totalChargedAmount: user.totalChargedAmount || 0,
  };
  res.status(httpStatus.OK).send(badgesData);
});
//  ---
// Get the user's friends list

// VIP Level and Subscription Controllers

// Get VIP level of a user
const getVipLevel = catchAsync(async (req, res) => {
  const vipLevel = await profileService.getVipLevel(req.user.id);
  res.status(httpStatus.OK).send({
    vip_level: vipLevel.level,
    isVip: vipLevel.expirationDate > new Date(),
    expiration_date: vipLevel.expirationDate,
  });
});

// Get Pro expiration date of a user
const getPro = catchAsync(async (req, res) => {
  const pro = await profileService.getPro(req.user.id);
  res.status(httpStatus.OK).send({
    isPro: pro.expirationDate > new Date(),
    expiration_date: pro.expirationDate,
  });
});

// Store and Inventory Controllers

// Get store sections for the user
const getStoreSections = catchAsync(async (req, res) => {
  const storeData = await profileService.getStoreSections(req.params.id);
  res.status(httpStatus.OK).send(storeData);
});

// Get user level data
const getUserLevel = catchAsync(async (req, res) => {
  const levelData = await levelService.getLevel(req.user.id);
  res.status(httpStatus.OK).send(levelData);
});

// Get credits history of a user
const getCreditsHistory = catchAsync(async (req, res) => {
  const { page, limit } = req.query;

  const creditsHistory = await profileService.getCreditsHistory(req.user.id, Number(page || 1), Number(limit || 10));
  res.status(httpStatus.OK).send(creditsHistory);
});

// Get credits agency data for a user
const getCreditsAgency = catchAsync(async (req, res) => {
  const agencyData = await profileService.getCreditsAgency(req.params.id);
  res.status(httpStatus.OK).send(agencyData);
});

// Get host agency data for a user
const getHostAgencyData = catchAsync(async (req, res) => {
  const hostAgencyData = await profileService.getHostAgencyData(req.params.id);
  res.status(httpStatus.OK).send(hostAgencyData);
});

// Social Interaction Controllers

// Follow another user
const followUser = catchAsync(async (req, res) => {
  await userService.followUser(req.user.id, req.params.userId);
  res.status(httpStatus.OK).send({ message: 'User followed successfully' });
});

// Unfollow another user
const unfollowUser = catchAsync(async (req, res) => {
  await userService.unfollowUser(req.user.id, req.params.userId);
  res.status(httpStatus.OK).send({ message: 'User unfollowed successfully' });
});

// Block another user
const blockUser = catchAsync(async (req, res) => {
  await userService.blockUser(req.user.id, req.params.userId);
  res.status(httpStatus.OK).send({ message: 'User blocked successfully' });
});

// Unblock another user
const unblockUser = catchAsync(async (req, res) => {
  await userService.unblockUser(req.user.id, req.params.userId);
  res.status(httpStatus.OK).send({ message: 'User unblocked successfully' });
});

// Join Requests and Agency Management Controllers

// Get join requests for a user
const getJoinRequests = catchAsync(async (req, res) => {
  const joinRequests = await profileService.getJoinRequests(req.params.id);
  res.status(httpStatus.OK).send({ users: joinRequests });
});

// Search Controllers

// get user settings
const getProfileSettings = catchAsync(async (req, res) => {
  const { id } = req.user;
  const profile = await User.findById(id).select('settings');
  if (!profile) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Profile not found', 'الملف الشخصي غير موجود');
  }
  res.json(profile.settings);
});

// Update user settings
const updateProfileSettings = catchAsync(async (req, res) => {
  const { friendsMessages, systemMessages, giftsFromPossibleFriends, addFollowers } = req.body;
  const profile = await User.findByIdAndUpdate(
    req.user.id,
    {
      $set: {
        'settings.friendsMessages': friendsMessages,
        'settings.systemMessages': systemMessages,
        'settings.giftsFromPossibleFriends': giftsFromPossibleFriends,
        'settings.addFollowers': addFollowers,
      },
    },
    { new: true }
  );

  if (!profile) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Profile not found', 'الملف الشخصي غير موجود');
  }

  res.json(profile.settings);
});
/**
 * Get all contact information
 * @returns {Promise<Array>}
 */
const getContacts = catchAsync(async (req, res, next) => {
  try {
    const contacts = await Contact.find();
    res.status(httpStatus.OK).send(contacts);
  } catch (error) {
    next(error);
  }
});

/**
 * Add a new contact
 * @param {object} req
 * @param {object} res
 * @param {Function} next
 * @returns {Promise<object>}
 */
const addContact = catchAsync(async (req, res, next) => {
  try {
    const requestBody = req.body;
    if (req.file) {
      requestBody.avatar = req.file.location;
    }
    const contact = await Contact.create(requestBody);
    res.status(httpStatus.CREATED).send(contact);
  } catch (error) {
    next(error);
  }
});
/**
 * Edit a contact
 * @param {object} req
 * @param {object} res
 * @param {Function} next
 * @returns {Promise<object>}
 */
const editContact = async (req, res, next) => {
  try {
    const requestBody = req.body;
    if (req.file) {
      requestBody.avatar = req.file.location;
    }
    const contact = await Contact.findById(req.params.contactId);
    if (!contact) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Contact not found', 'المستخدم غير موجود');
    }
    Object.assign(contact, requestBody);
    await contact.save();
    res.status(httpStatus.OK).send(contact);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a contact
 * @param {object} req
 * @param {object} res
 * @param {Function} next
 * @returns {Promise<object>}
 */
const deleteContact = catchAsync(async (req, res, next) => {
  try {
    const contact = await Contact.findById(req.params.contactId);
    if (!contact) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Contact not found', 'المستخدم غير موجود');
    }
    await contact.deleteOne();
    res.status(httpStatus.OK).send({ message: 'Contact deleted successfully', messageAr: 'تم حذف المستخدم بنجاح' });
  } catch (error) {
    next(error);
  }
});

const getCredits = catchAsync(async (req, res) => {
  const { id } = req.user;
  const user = await User.findById(id).select('credits');
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }
  res.json({ credits: user.credits });
});
const getChargeLevel = catchAsync(async (req, res) => {
  const { id } = req.user;
  const data = await chargeService.getChargeLevel(id);
  console.log('data', data);
  res.status(httpStatus.OK).send(data);
});

// edit user data

const addImageToAlbum = catchAsync(async (req, res) => {
  console.log('req.files', req.files);
  console.log('req.body', req.body);
  if (!req.files || req.files.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Images are required', 'الصور مطلوبة');
  }

  // req.body.edited = JSON.parse(req.body.edited);
  const edited = req.body.edited
    .split(',')
    .map((index) => index * 1)
    .filter((index) => !Number.isNaN(index));
  edited.forEach((index) => {
    if (index > 5) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid index', 'رقم غير صالح');
    }
  });
  console.log('edited', edited);
  const images = req.files.map((image, index) => {
    if (index > 5) return;
    return {
      image: image.location,
      index: edited[index] * 1,
    };
  });
  // {image : 'url', index: 1}

  const album = await profileService.addImageToAlbum(req.user.id, images);
  res.status(httpStatus.OK).json({
    message: 'Image added to album',
    messageAr: 'تمت إضافة الصورة إلى الألبوم',
    album,
  });
});

// Delete image from album
const deleteImageFromAlbum = catchAsync(async (req, res) => {
  const { image } = req.body;
  const album = await profileService.deleteImageFromAlbum(req.user.id, image);
  res.status(httpStatus.OK).json({
    message: 'Image removed from album',
    messageAr: 'تمت إزالة الصورة من الألبوم',
    album,
  });
});

// Sort album images
const sortAlbum = catchAsync(async (req, res) => {
  const { sortedAlbum } = req.body;
  const updatedProfile = await profileService.sortAlbum(req.user.id, sortedAlbum);
  res.status(httpStatus.OK).json({
    message: 'Album sorted',
    messageAr: 'تم ترتيب الألبوم',
    updatedProfile,
  });
});
const updateInterests = catchAsync(async (req, res) => {
  const { interests } = req.body;
  console.log('interests', interests);
  const updatedProfile = await profileService.updateInterests(req.user.id, interests);
  res.status(httpStatus.OK).json({
    message: 'Interests updated',
    messageAr: 'تم تحديث الاهتمامات',
    updatedProfile,
  });
});

// Edit profile info (name, country, birthdate)
const editProfile = catchAsync(async (req, res) => {
  const userBody = req.body;
  if (req.file) {
    userBody.avatar = req.file.location;
  }
  // if something is null remove it from the object
  Object.keys(userBody).forEach((key) => {
    if (userBody[key] === '' || userBody[key] === null) {
      delete userBody[key];
    }
  });
  console.log('userBody', userBody);

  // check if user body includes isMale 
  if (userBody.isMale !== undefined && userBody.isMale !== null && userBody.isMale !== '') {
    // check gender changing limit
    await profileService.checkLimitGenderChanges(req.user.id, userBody.isMale);
  }

  const updatedUser = await profileService.editProfile(req.user.id, userBody);
  res.status(httpStatus.OK).json({
    message: 'Profile updated',
    messageAr: 'تم تحديث الملف الشخصي',
    updatedUser,
  });
});

// Upload avatar
const uploadAvatar = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Avatar file is required', 'ملف الصورة مطلوب');
  }
  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  const updatedUser = await profileService.uploadAvatar(req.user.id, avatarUrl);
  res.status(httpStatus.OK).json({
    message: 'Avatar uploaded successfully',
    messageAr: 'تم تحميل الصورة بنجاح',
    avatar: avatarUrl,
    updatedUser,
  });
});
const updateAbout = catchAsync(async (req, res) => {
  const { data } = req.body;
  const updatedProfile = await profileService.updateAbout(req.user.id, data);
  res.status(httpStatus.OK).json({
    message: 'About section updated',
    messageAr: 'تم تحديث القسم حول',
    updatedProfile,
  });
});

const subscribeVip = catchAsync(async (req, res) => {
  const { level, days } = req.body || {
    level: 1,
    days: 7,
  };
  // duration is months 1 | 2 | 3
  console.log('level', level);
  const vip = await profileService.subscribeVip(req.user.id, level, days);
  if (level >= 4 && level != vip.prevVipLevel) {
    await messageSender.sendToAll(
      'user-vip-subscribed',
      {
        id: req.user.id,
        name: req.user.name,
        avatar: req.user.avatar,
        level,
        days,
        prevVipLevel: vip.prevVipLevel,
        firstTime: vip.firstTime == level,
      },
      false
    );
  }
  res.status(httpStatus.OK).send(vip);
});

const subscribePro = catchAsync(async (req, res) => {
  const { months } = req.body;
  const pro = await profileService.subscribePro(req.user.id, months);
  res.status(httpStatus.OK).send(pro);
});

const vipTransferCredits = catchAsync(async (req, res) => {
  const { amount, userId } = req.body;

  if (req.user.id === userId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot transfer credits to yourself', 'لا يمكن نقل النقاط إلى نفسك');
  }

  // Check if the user is VIP level 4 or higher
  const [isVip, target] = await Promise.all([profileService.checkVipLevel(req.user.id, 7), User.findById(userId)]);

  if (!isVip) {
    throw new ApiError(httpStatus.FORBIDDEN, 'VIP required', 'يتطلب عضوية VIP');
  }

  if (!target) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }

  // Transfer credits
  const transfer = await userService.transferCredits(req.user.id, userId, Number(amount));
  res.status(httpStatus.OK).send(transfer);
});

const transferCash = catchAsync(async (req, res) => {
  const { amount, userId, tokenized } = req.body;

  // decrypt the room id
  // TODO decrypt the room id

  const roomId = tokenized;

  if (amount > 200) {
    res.status(httpStatus.OK).send({
      message: 'Cash transferred successfully',
      messageAr: 'تم نقل النقود بنجاح',
    });
  }

  // getParticipant
  const user = await liveKitService.getParticipant(roomId, userId);
  console.log('user', user);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }

  if (req.user.id === userId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot transfer credits to yourself', 'لا يمكن نقل النقاط إلى نفسك');
  }

  // Transfer credits
  const transfer = await userService.transferCredits(req.user.id, userId, Number(amount));
  res.status(httpStatus.OK).send({
    message: 'Cash transferred successfully',
    messageAr: 'تم نقل النقود بنجاح',
  });
});

const getRelations = catchAsync(async (req, res) => {
  const { targetUserId } = req.params;
  const userId = req.user.id;

  // check by the params and if all check for all
  const relations = await userService.getUserRelations(userId, targetUserId);
  res.status(httpStatus.OK).send(relations);
});

module.exports = {
  getUserProfile,
  getPublicProfile,
  getVipLevel,
  getPro,
  getStoreSections,
  getUserLevel,
  getCreditsHistory,
  getCreditsAgency,
  getHostAgencyData,
  followUser,
  unfollowUser,
  blockUser,
  unblockUser,
  getJoinRequests,
  getProfileSettings,
  updateProfileSettings,
  getContacts,
  addContact,
  editContact,
  deleteContact,
  getCredits,
  getChargeLevel,
  getGiftWall,
  addImageToAlbum,
  deleteImageFromAlbum,
  sortAlbum,
  updateInterests,
  editProfile,
  uploadAvatar,
  updateAbout,
  getProfileVisitors,
  getBadgeWall,
  subscribeVip,
  subscribePro,
  vipTransferCredits,
  getRelations,
  getMiniProfile,
  transferCash,
};
