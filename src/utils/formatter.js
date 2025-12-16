const { getVipMicEffect } = require('../config/stores.config');
/**
 * Formats a user object to match the specified structure
 * @param {object} user - The user object from Mongoose
 * @returns {object} - Formatted user object
 */
const formatUserModel = (user) => {
  if (!user) return null;

  return {
    userId: user.userId,
    id: user._id,
    name: user.name,
    avatar: user.avatar,
    wing: user.wing,
    frame:
      user.frame.expirationDate > new Date()
        ? user.frame
        : {
            url: null,
            expirationDate: user.frame.expirationDate,
          },
    isMale: user.isMale,
    isHost: !!user.host,
    dateOfBirth: user.dateOfBirth,
    isAgencyHoster: user.isAgencyHost || false,
    isSuperAdmin: user.isSuperAdmin || false,
    isCustomerService: user.isCustomerService || false,
    credits: user.credits || 0,
    level: user.level || 0,
    famePoints: user.famePoints || 0,
    chargeLevel: user.chargeLevel || 0,
    countryCode: user.countryCode || '',
    creditAgency: user.creditAgency || null,
    currentRoom: user.currentRoom || null,
  };
};
const loginFormatter = (user) => {
  if (!user) return {};
  user = user.toJSON() || user;
  return {
    userId: user.userId,
    id: user._id,
    name: user.name,
    avatar: user.avatar,
    wing: user.wing,
    soundEffect: user.soundEffect,
    enterEffect: user.enterEffect,
    typingBubble: user.typingBubble,
    currentRoom: user.currentRoom || null,
    // force number for typingColor to avoid issues with undefined
    typingColor: user.typingColor ? Number(user.typingColor) : 0,
    frame:
      user.frame.expirationDate > new Date()
        ? user.frame
        : {
            url: null,
            expirationDate: user.frame.expirationDate,
          },
    friendsCount: user.friendsCount,
    followersCount: user.followersCount,
    followingCount: user.followingCount,
    isHost: !!user.host,
    phone: user.phone,
    isMale: user.isMale,
    isAgencyHoster: user.isAgencyHost,
    isSuperAdmin: user.isSuperAdmin,
    isCustomerService: user.isCustomerService,
    credits: user.credits || 0,
    level: user.level || 0,
    famePoints: user.famePoints || 0,
    richPoints: user.richPoints || 0,
    chargeLevel: user.chargeLevel || 0,
    countryCode: user.countryCode || '',
    creditAgency: user.creditAgency && true,
    isGoogle: Boolean(user.googleId),
    isFacebook: Boolean(user.facebookId),
    dateOfBirth: user.dateOfBirth,
    vip: user.vip.level > 0 && user.vip.expirationDate > new Date() ? user.vip.level : 0,
    vipMicEffect: user.vip.level > 0 && user.vip.expirationDate > new Date() ? getVipMicEffect(user.vip.level) : null,
    isPro: user.pro.expirationDate > new Date(),
    room: user.room,
    group: user.group
  };
};
const ProfileUserFormatter = (user) => {
  if (!user) return {};
  return {
    userId: user.userId,
    id: user._id,
    userName: user.name,
    avatar: user.avatar,
    frame:
      user.frame?.expirationDate > new Date()
        ? user.frame
        : {
            url: null,
            expirationDate: user.frame.expirationDate,
          },
    wing: user.wing?.expirationDate > new Date() ? user.wing : null,
    isHost: !!user.host,
    phone: user.phone,
    currentRoom: user.currentRoom || null,
    isMale: user.isMale,
    isAgencyHoster: user.isAgencyHost || false,
    dateOfBirth: user.dateOfBirth,
    userCountryCode: user.countryCode || '',
    level: user.level || 0,
    famePoints: user.famePoints || 0,
    richPoints: user.richPoints || 0,
    chargeLevel: user.chargeLevel || 0,
    userGroupName: user.group?.name || '',
    friendsCount: user.friendsCount,
    followersCount: user.followersCount,
    followingCount: user.followingCount,
    isCustomerService: user.isCustomerService || false,
    isAgentCharge: (user.creditAgency && true) || false,
    isSuperAdmin: user.isSuperAdmin || false,
    vip: user.vip.level > 0 && user.vip.expirationDate > new Date() ? user.vip.level : null,
    isPro: user.pro.expirationDate > new Date(),
  };
};

module.exports = {
  formatUserModel,
  loginFormatter,
  ProfileUserFormatter,
};
