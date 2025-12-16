const mongoose = require('mongoose');
const httpStatus = require('http-status');
const GroupContribution = require('../../models/group/groupContribution.model');
const Group = require('../../models/group.model');
const logger = require('../../config/logger');
const userService = require('../user.service');
const { calculatePagination } = require('../../utils/pagination');

const CONTRIBUTION_FACTOR = 0.001;
const ApiError = require('../../utils/ApiError');

const USER_SELECT_FIELDS = 'name userId avatar';

/**
 * Add contribution points for a user in a group
 * @param {string} userId - The ID of the user contributing points
 * @param {string} groupId - The ID of the group receiving the contribution
 * @param {number} points - The number of points to contribute
 * @param {string} [roomId] - Optional room ID associated with the contribution
 * @returns {Promise<GroupContribution>} The created/updated contribution document
 */
const addContribution = async (userId, groupId, points, roomId = null) => {
  if (points <= 0) {
    return null;
  }
  const today = new Date();
  logger.info(`Adding contribution for user ${userId} in group ${groupId} with points ${points} and roomId ${roomId}`);
  const amount = points * CONTRIBUTION_FACTOR; // Convert points to contribution credits, rounded to 2 decimals
  console.log('today', today);
  console.log('today.getDate()', today.getDate());
  console.log('today.getMonth()', today.getMonth());
  console.log('amount', amount);

  const contribution = await GroupContribution.findOneAndUpdate(
    {
      user: userId,
      group: groupId,
      day: today.getDate(),
      month: today.getMonth(),
    },
    {
      $inc: { points: amount },
      roomId,
    },
    {
      upsert: true,
      new: true,
    }
  );

  // Update total contribution credits in group
  await Group.findByIdAndUpdate(groupId, {
    $inc: { contributionCredits: amount },
  });

  return contribution;
};

/**
 * Get contributions for a specific day in current month
 * @param {string} groupId - The ID of the group to get contributions for
 * @param {number} day - The day of the month to get contributions for
 * @param {number} page
 * @param {number} limit
 * @returns {Promise<Array<GroupContribution>>} Array of contributions for the specified day
 */
const getDailyContributions = async (groupId, day, page = 1, limit = 10) => {
  const currentMonth = new Date().getMonth();
  day = Number(day);
  // fetch group
  const group = await Group.findById(groupId).select('contributionCredits');
  if (!group) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Group not found', 'هذه المجموعة غير موجودة');
  }
  const contributions = await GroupContribution.find({
    group: groupId,
    day,
    month: currentMonth,
    points: { $gt: 0 },
  })
    .select('user points createdAt')
    .populate('user', USER_SELECT_FIELDS)
    .sort({ points: -1, createdAt: 1 })
    .skip((page - 1) * limit)
    .limit(limit);
  // round points to 0 decimals floor
  // contributions.forEach((contribution) => {
  //   contribution.points = Math.floor(contribution.points || 0);
  // });
  // Transform contributions to handle deleted users
  const transformedContributions = userService.transformDeletedUsers(contributions, 'user');
  const total = await GroupContribution.countDocuments({
    group: groupId,
    day,
    month: currentMonth,
    points: { $gt: 0 },
  });
  const pagination = calculatePagination(total, page, limit);
  return {
    contributions: transformedContributions,
    pagination,
    total: Math.floor(group.contributionCredits || 0),
  };
};

/**
 * Get total contributions for current month
 * @param {string} groupId - The ID of the group to get contributions for
 * @param {number} page
 * @param {number} limit
 * @returns {Promise<Array<object>>} Array of aggregated monthly contributions per user
 */
// const getMonthlyContributions = async (groupId, page = 1, limit = 10) => {
//   const currentMonth = new Date().getMonth();
//   console.log('currentMonth', currentMonth);
//   console.log('groupId', groupId);
//   // add total count of documents for pagination
//   // add total count of documents for pagination
//   const countPipeline = [
//     {
//       $match: {
//         group: new mongoose.Types.ObjectId(groupId),
//         month: currentMonth,
//       },
//     },
//     {
//       $group: {
//         _id: '$user',
//         points: { $sum: '$points' },
//       },
//     },
//     {
//       $count: 'total',
//     },
//   ];

//   const [totalResult] = await GroupContribution.aggregate(countPipeline);
//   const total = totalResult ? totalResult.total : 0;

//   const contributions = await GroupContribution.aggregate([
//     {
//       $match: {
//         group: new mongoose.Types.ObjectId(groupId),
//         month: currentMonth,
//       },
//     },
//     {
//       $group: {
//         _id: '$user',
//         points: { $sum: '$points' },
//       },
//     },
//     {
//       $sort: { points: -1 },
//     },
//     {
//       $lookup: {
//         from: 'users',
//         localField: '_id',
//         foreignField: '_id',
//         as: 'user',
//       },
//     },
//     {
//       $unwind: '$user',
//     },
//     {
//       $project: {
//         _id: 1,
//         points: 1,
//         'user.name': 1,
//         'user.userId': 1,
//         'user.avatar': 1,
//         'user._id': 1,
//       },
//     },
//     {
//       $skip: (page - 1) * limit,
//     },
//     {
//       $limit: limit,
//     },
//   ]);
//   // round points to 0 decimals floor
//   contributions.forEach((contribution) => {
//     contribution.points = Math.floor(contribution.points || 0);
//   });

//   const pagination = calculatePagination(total, page, limit);
//   return {
//     contributions,
//     pagination,
//   };
// };

const getMonthlyContributions = async (groupId, page = 1, limit = 10) => {
  const currentMonth = new Date().getMonth();
  const groupObjectId = new mongoose.Types.ObjectId(groupId);

  // Shared match stage (best practice)
  const matchStage = {
    group: groupObjectId,
    month: currentMonth,
    points: { $gt: 0 }, // 🚀 EXCLUDE USERS WITH ONLY ZERO POINTS
  };

  // 1️⃣ COUNT USERS AFTER GROUPING
  const countPipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: '$user',
        points: { $sum: '$points' },
      },
    },
    {
      $match: {
        points: { $gt: 0 }, // 🚀 EXCLUDE AGAIN AFTER SUM (SAFETY)
      },
    },
    { $count: 'total' },
  ];

  const [countResult] = await GroupContribution.aggregate(countPipeline);
  const total = countResult ? countResult.total : 0;

  // 2️⃣ FETCH PAGINATED RESULT
  const contributions = await GroupContribution.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$user',
        points: { $sum: '$points' },
      },
    },
    {
      $match: {
        points: { $gt: 0 }, // 🚀 REMOVE 0-POINT USERS AFTER SUM
      },
    },
    { $sort: { points: -1 } },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $project: {
        _id: 1,
        points: 1,
        'user.name': 1,
        'user.userId': 1,
        'user.avatar': 1,
        'user._id': 1,
      },
    },
    { $skip: (page - 1) * limit },
    { $limit: limit },
  ]);

  // Round points down
  contributions.forEach((c) => {
    c.points = Math.floor(c.points);
  });

  const pagination = calculatePagination(total, page, limit);

  return {
    contributions,
    pagination,
    total,
  };
};


/**
 * Delete all contributions from previous month
 * This should be run by a scheduled job at the start of each month
 * @returns {Promise<void>}
 */
const deleteMonthlyContributions = async () => {
  // delete all not current month contributions
  const currentMonth = new Date().getMonth();

  await GroupContribution.deleteMany({
    month: { $ne: currentMonth },
  });
};

/**
 * Collect contributions for a group (admin only)
 * @param {string} groupId - The ID of the group to collect contributions from
 * @returns {Promise<Group>} The updated group with the collected contributions
 * @throws {ApiError} If group not found or no contributions to collect
 */
const CollectContributions = async (groupId) => {
  const group = await Group.findById(groupId).select('contributionCredits admin');
  logger.info(`Collecting contributions for group ${groupId} from ${group.contributionCredits} credits`);
  if (!group) {
    logger.error(`Group ${groupId} not found`);
    throw new ApiError(httpStatus.NOT_FOUND, 'Group not found', 'هذه المجموعة غير موجودة');
  }
  if (group.contributionCredits <= 0) {
    logger.info(`No contributions to collect for group ${groupId}`);
    throw new ApiError(httpStatus.NOT_FOUND, 'No contributions to collect', 'لا يوجد اي مساهمات لتحويلها');
  }
  // set to zero and increase admin credits
  const amount = group.contributionCredits;
  group.contributionCredits = 0;
  logger.info(`Increasing admin credits for group ${groupId}`);
  await userService.increaseUserBalance(group.admin, amount);
  await group.save();
  return {
    group,
    amount,
  };
};

module.exports = {
  addContribution,
  getDailyContributions,
  getMonthlyContributions,
  deleteMonthlyContributions,
  CollectContributions,
};
