// services/achievementService.js

const { Achievement, User } = require('../../models');
const { updateLevelPoints } = require('./level.service');
const { pointsPerAction, dailyActions, actions } = require('../../config/levels/userLevels');
const logger = require('../../config/logger');
const messageSender = require('../chat/messageSender');

// const updateUserLevel = async (userId, pointsEarned) => {
//   const user = await User.findById(userId);
//   user.totalPoints += pointsEarned;
//   const newLevel = userLevelsConfig.levels.findIndex((level) => user.totalPoints < level.requiredPoints) - 1;

//   if (newLevel > user.level) {
//     user.level = newLevel;
//     const levelConfig = userLevelsConfig.levels[newLevel];

//     const medal = userLevelsConfig.medals.find((m) => m.level === newLevel);
//     if (medal) {
//       user.medals.push(medal.medal);
//     }
//   }

//   await user.save();
// };
/**
 *
 * @param {*} userId
 * @param {*} action
 * @param {*} additionalData
 * @returns
 */

const recordAchievement = async (
  userId,
  action,
  additionalData = {
    targetUser: null,
    giftId: null,
    roomId: null,
    giftValue: 0,
    name: '',
    avatar: '',
  }
) => {
  logger.info('recordAchievement %o', { userId, action, additionalData });
  const { targetUser, giftId, roomId, giftValue, name, avatar } = additionalData;

  // Check if this achievement already exists for daily actions
  const isDailyAction = dailyActions.includes(action);
  console.log('isDailyAction', isDailyAction);

  const todayStart = new Date().setHours(0, 0, 0, 0);

  if (action === actions.follow) {
    //  send notification to the target user
    await messageSender.sendToUser(
      'newFollower',
      {
        followerId: userId,
        name,
        avatar,
        message: 'You have a new follower',
      },
      targetUser.toString(),
      true
    );
  }

  if (isDailyAction) {
    console.log('isDailyAction', isDailyAction);
    console.log('todayStart', todayStart);
    console.log('todayStart', todayStart);
    const existingAchievement = await Achievement.findOne({
      user: userId,
      action,
      ...(targetUser && { targetUser }),
      ...(giftId && { giftId }),
      ...(roomId && { roomId }),
      ...(isDailyAction && { date: { $gte: todayStart } }), // Check for today only if daily action
    });

    if (existingAchievement && isDailyAction) {
      console.log('existingAchievement', existingAchievement);
      return false;
    }
  }

  let points = pointsPerAction[action] || 0;
  if (action === actions.giftSent) {
    points = giftValue || 0;
  }
  console.log('points', points);

  const newAchievement = new Achievement({
    user: userId,
    action,
    points,
    ...(targetUser && { targetUser }),
    ...(giftId && { giftId }),
    ...(roomId && { roomId }),
  });

  newAchievement.save();
  await updateLevelPoints(userId, points);

  return newAchievement;
};
const getUserAchievements = async (userId, options) => {
  return Achievement.find({ user: userId }).sort({ date: -1 }).limit(options.limit);
};

const getAchievementsByAction = async (action) => {
  return Achievement.find({ action }).sort({ date: -1 });
};

const getTotalPointsForUser = async (userId) => {
  const user = await User.findById(userId).select('totalPoints');
  return user.totalPoints;
};

module.exports = {
  recordAchievement,
  getUserAchievements,
  getAchievementsByAction,
  getTotalPointsForUser,
  actions,
};
