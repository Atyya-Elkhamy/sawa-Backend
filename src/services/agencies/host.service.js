const httpStatus = require('http-status');
const { Host, User } = require('../../models');
const ApiError = require('../../utils/ApiError');
const hostConfig = require('../../config/levels/hostTargets');
const creditAgencyService = require('./creditAgency.service');
const userService = require('../user.service');
const HostDailyRecord = require('../../models/agencies/hostDailyRecord.model');
const logger = require('../../config/logger');

const getHostDataByUserId = async (userId, select) => {
  // get virtual fields
  const host = await Host.findOne({ user: userId }).select(select).populate('agency', 'name agencyId ');
  if (!host) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Host not found', 'المضيف غير موجود');
  }
  return host;
};
const checkIfUserIsHost = async (userId, skipCheck = false) => {
  const host = await Host.findOne({ user: userId });
  if (!host && !skipCheck) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Host not found', 'المضيف غير موجود');
  }
  return host;
};
const getHostSalary = (currentDiamonds) => {
  const salary = Math.floor(currentDiamonds * hostConfig.salaryConversionRates.hostDiamondToUSD);
  return salary || 0;
};
const getHostData = async (userId) => {
  // First, get the basic host data (including currentDiamonds and agency info)
  const host = await getHostDataByUserId(userId, 'currentDiamonds agency');
  if (!host) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Host not found', 'المضيف غير موجود');
  }
  console.log('host', host);

  // Set up the date boundaries based on the current date
  const now = new Date();

  // Daily boundaries (from the start of today to the end of today)
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // Monthly boundaries (from the first day of the current month to the first day of the next month)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // Retrieve the daily record for the current day
  const dailyRecord = await HostDailyRecord.findOne({
    host: host._id,
    day: { $gte: dayStart, $lte: dayEnd },
  }).lean();

  // Aggregate monthly diamonds by summing diamondsCollected from all daily records in the current month
  const monthlyAgg = await HostDailyRecord.aggregate([
    {
      $match: {
        host: host._id,
        day: { $gte: monthStart, $lt: monthEnd },
      },
    },
    {
      $group: {
        _id: null,
        monthlyDiamonds: { $sum: '$diamondsCollected' },
      },
    },
  ]);
  console.log('hostId', host._id);

  console.log('monthlyAgg', monthlyAgg);
  console.log('monthStart', monthStart, 'monthEnd', monthEnd);

  // Extract values or default to 0 if no record is found
  const monthlyDiamonds = (monthlyAgg.length && monthlyAgg[0].monthlyDiamonds) || 0;
  const dailyDiamonds = (dailyRecord && dailyRecord.diamondsCollected) || 0;
  const dailySalary = (dailyRecord && dailyRecord.expectedDailySalary) || 0;

  // Return the host data along with the additional computed fields
  return {
    host,
    monthlyDiamonds,
    dailyDiamonds,
    dailySalary,
  };
};

/**
 * Transfer cash from host to user
 * @param {string} fromUserId
 * @param {string} toUserId
 * @param {number} amount
 * @param {string} formatedId
 * @returns {Promise<*>}
 * @throws {ApiError}
 */

const transferCashToUser = async (fromUserId, toUserId, amount, formatedId) => {
  // Validate input
  logger.info('transferCashToUser', { fromUserId, toUserId, amount, formatedId });
  if (amount <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid amount', 'المبلغ غير صالح');
  }

  // Find the host and validate their balance
  const host = await Host.findOne({ user: fromUserId });
  if (!host) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Host not found', 'المضيف غير موجود');
  }

  // Check if salary transfer is blocked
  if (host.blockSalaryTransfer) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Salary transfer is blocked for this host', 'تحويل الراتب محظور لهذا المضيف');
  }

  // Calculate diamonds to deduct from host (using host's salary rate)
  const diamondsToBeDeducted = Math.floor(amount / hostConfig.salaryConversionRates.hostDiamondToUSD);
  if (diamondsToBeDeducted > host.currentDiamonds) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient balance', 'الرصيد غير كاف');
  }

  // Calculate diamonds to add to user (using agency transfer rate)
  const diamondsToBeAdded = Math.floor(amount / hostConfig.transferConversionRates.userDiamondToUSD); // <-- Changed here

  // Find the user and validate their existence
  const toUser = await User.findById(toUserId);
  if (!toUser) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }

  // Perform the transfer
  host.currentDiamonds = Math.floor(host.currentDiamonds - diamondsToBeDeducted);

  await Promise.all([
    host.save(), // Save host updates
    userService.increaseUserBalance(
      toUserId,
      diamondsToBeAdded,
      `transfer from host  ${formatedId}`,
      `تحويل من مضيف  ${formatedId}`
    ), // Update user balance
  ]);

  // log wallet transaction for host
  await userService.logWalletTransaction(
    fromUserId,
    diamondsToBeAdded,
    'debit',
    `transfer to user ${toUser.userId}`,
    `تحويل إلى مستخدم ${toUser.userId}`
  );

  return {
    host,
    USD: amount,
    diamondsToBeDeducted,
    diamondsToBeAdded,
    remainingDiamonds: host.currentDiamonds,
  };
};

/**
 * Transfer cash from host to credit agency
 * @param {string} fromUserId
 * @param {string} toCreditAgencyId
 * @param {number} amount
 * @param {string} formatedId
 * @returns {Promise<*>}
 * @throws {ApiError}
 */

const transferCashToCreditAgency = async (fromUserId, toCreditAgencyId, amount, formatedId) => {
  // Validate input amount
  logger.info('transferCashToCreditAgency', { fromUserId, toCreditAgencyId, amount, formatedId });
  if (amount <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid amount', 'المبلغ غير صالح');
  }

  // Find host and validate balance
  const host = await Host.findOne({ user: fromUserId });
  if (!host) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Host not found', 'المضيف غير موجود');
  }

  // Check if salary transfer is blocked
  if (host.blockSalaryTransfer) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Salary transfer is blocked for this host', 'تحويل الراتب محظور لهذا المضيف');
  }

  // Calculate diamonds to deduct from host (using host's salary rate)
  const diamondsToBeDeducted = Math.floor(amount / hostConfig.salaryConversionRates.hostDiamondToUSD);
  if (diamondsToBeDeducted > host.currentDiamonds) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient balance', 'الرصيد غير كاف');
  }

  // Calculate diamonds to transfer to credit agency (using agency transfer rate)

  const diamondsToBeAdded = Math.floor(amount / hostConfig.transferConversionRates.creditAgencyDiamondToUSD); // <-- Changed here

  console.log('diamondsToBeAdded', diamondsToBeAdded);
  // Execute transfer and update balances
  const creditAgency = await creditAgencyService.receiveCredits(toCreditAgencyId, diamondsToBeAdded, fromUserId);
  // log wallet transaction for host
  await userService.logWalletTransaction(
    fromUserId,
    diamondsToBeAdded,
    'debit',
    `transfer to credit agency ${creditAgency?.name}`,
    `تحويل إلى وكالة شحن ${creditAgency?.name}`
  );

  host.currentDiamonds = Math.floor(host.currentDiamonds - diamondsToBeDeducted);
  await host.save();

  return {
    host,
    USD: amount,
    diamondsToBeDeducted,
    diamondsToBeAdded,
    remainingBalance: host.currentDiamonds,
  };
};

module.exports = {
  getHostData,
  getHostDataByUserId,
  getHostSalary,
  transferCashToUser,
  transferCashToCreditAgency,
  checkIfUserIsHost,
};
