const httpStatus = require('http-status');
const mongoose = require('mongoose');
const { Agency, Host, User, HostDailyRecord } = require('../../models');
const ApiError = require('../../utils/ApiError');
const hostConfig = require('../../config/levels/hostTargets');
const creditAgencyService = require('./creditAgency.service');
const { getMonthDateRange } = require('../../utils/timePeriods');
const { generateUniqueUserId } = require('../../utils/IDGen');
const { calculatePagination } = require('../../utils/pagination');
const logger = require('../../config/logger');
const userService = require('../user.service');

/**
 * get all agencies
 * @param {number} page
 * @param {number} limit
 * @returns {Promise<Agency[]>}
 */
const getAgencies = async (page = 1, limit = 10) => {
  const agencies = await Agency.find()
    .select('name agencyId id admin')
    .populate('admin', 'name avatar id')
    .sort({ _id: 1 })
    .limit(limit)
    .skip(limit * (page - 1));

  // Transform agencies to handle deleted admins
  const transformedAgencies = userService.transformDeletedUsers(agencies, 'admin');

  const totalAgencies = await Agency.countDocuments();
  const calculatedPagination = calculatePagination(totalAgencies, page, limit);
  return {
    agencies: transformedAgencies,
    ...calculatedPagination,
  };
};

/**
 * Get agency by ID
 * @param {ObjectId} agencyId
 * @returns {Promise<Agency>}
 */

const getAgencyById = async (agencyId) => {
  const agency = await Agency.findById(agencyId).populate('admin', 'name avatar id');
  if (!agency) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Agency not found');
  }

  // Transform agency to handle deleted admin
  const transformedAgency = userService.transformDeletedUsers(agency, 'admin');
  return transformedAgency;
};

const getAgencyByAdminId = async (adminId) => {
  console.log(adminId);
  const agency = await Agency.findOne({ admin: adminId }).select('name agencyId id admin currentDiamonds').lean();
  if (!agency) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Agency not found', 'الوكالة غير موجودة');
  }
  return agency;
};

/**
 * Add a host to an agency
 * @param {ObjectId} agencyId - Agency ID
 * @param {ObjectId} userId - User ID of the host
 * @param {object} targetData - Target data for the host (daily, monthly)
 * @returns {Promise<Agency>}
 */

const addHostToAgency = async (agencyId, userId) => {
  const agency = await getAgencyById(agencyId);
  if (!agency) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Agency not found', 'الوكالة غير موجودة');
  }
  const numberOfHosts = await Host.countDocuments({
    agency: agencyId,
  });
  if (numberOfHosts >= 1000) {
    throw new ApiError(httpStatus.NOT_FOUND, 'agency exceeded hosts limits ', 'الوكالة تعدت عدد المضيفين المسموح');
  }
  const user = await User.findById(userId).select('hostAgency host');

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }

  if (user.hostAgency) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User already has an agency', 'المستخدم لديه وكالة بالفعل');
  }
  const host = await Host.findOne({ user: userId });
  if (host) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Host already exists', 'المضيف موجود بالفعل');
  }

  const newHost = await Host.create({
    user: userId,
    agency: agencyId,
  });
  user.host = newHost._id;
  user.hostAgency = agencyId;

  await user.save();

  return newHost;
};

/**
 * Create a new agency
 * @param {object} agencyBody - Agency data
 * @returns {Promise<Agency>}
 */

const createAgency = async (agencyBody) => {
  const admin = await User.findById(agencyBody.admin).select('hostAgency isAgencyHost host');
  if (!admin) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Admin not found', 'المشرف غير موجود');
  }
  if (admin.hostAgency || admin.isAgencyHost || admin.host) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Admin already has an agency', 'المشرف لديه وكالة بالفعل');
  }

  if (await Agency.isNameTaken(agencyBody.name)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Agency name already taken', 'اسم الوكالة مأخوذ بالفعل');
  }
  const agencyId = await generateUniqueUserId();
  const agency = new Agency({ ...agencyBody, agencyId });
  await agency.save();

  const host = await Host.create({
    user: agencyBody.admin,
    agency: agency._id,
  });

  admin.hostAgency = agency._id;
  admin.isAgencyHost = true;
  admin.host = host._id;
  await admin.save();

  return agency;
};

/**
 * calculate the salary for agency
 * @param {number} currentDiamonds - Current diamonds for the agency
 * @returns {number} - The expected salary
 */

const calculateAgencySalary = (currentDiamonds) => {
  const salary = Math.floor(currentDiamonds * hostConfig.salaryConversionRates.agencyDiamondToUSD);
  return salary || 0;
};

/**
 * remove a host from an agency
 * @param {ObjectId} agencyId - Agency ID
 * @param {ObjectId} hostId
 * @param {ObjectId} adminId
 * @returns {Promise<boolean>}
 */

const removeHostFromAgency = async (agencyId, hostId, adminId) => {
  const host = await Host.findById(hostId);
  if (!host) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Host not found', 'المضيف غير موجود');
  }
  console.log(host.user?.toString(), adminId);

  if (host.user?.toString() == adminId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Admin cannot remove themselves', 'لا يمكن للادمن إزالة نفسه');
  }

  if (host.agency?.toString() != agencyId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Host does not belong to this agency', 'المضيف لا ينتمي لهذه الوكالة');
  }
  if (host.currentDiamonds > 0) {
    // deduct the diamonds from the agency with and to minimum of 0
    const agency = await Agency.findById(agencyId);
    if (agency) {
      agency.currentDiamonds = Math.max(0, agency.currentDiamonds - host.currentDiamonds);
      await agency.save();
    }
  }

  await host.deleteOne();

  const user = await User.findById(host.user);

  user.host = null;
  user.hostAgency = null;
  await user.save();

  return true;
};

const getAgencyData = async (userId) => {
  const agency = await Agency.findOne({ admin: userId })
    .select('name userId currentDiamonds id agencyId admin')
    .populate('admin', 'name userId avatar frame');
  if (!agency) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Agency not found', 'الوكالة غير موجودة');
  }

  // Transform agency to handle deleted admin
  const transformedAgency = userService.transformDeletedUsers(agency, 'admin');

  const hosts = await Host.find({ agency: agency.id })
    .populate('user', 'name avatar frame userId')
    .select('user currentDiamonds id')
    .sort({ _id: 1 });

  // Transform hosts to handle deleted users
  const transformedHosts = userService.transformDeletedUsers(hosts, 'user');

  return { agency: transformedAgency, hosts: transformedHosts };
};

const manageHosts = async (userId, page = 1, limit = 15) => {
  const agency = await Agency.findOne({ admin: userId });
  if (!agency) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Agency not found', 'الوكالة غير موجودة');
  }
  // get the admin host as the first user on ordering
  const adminHost = await Host.findOne({ user: agency.admin }).populate('user', 'name avatar frame userId isMale dateOfBirth');
  const hosts = await Host.find({ agency: agency.id, user: { $ne: agency.admin } })
    .select('user')
    .populate('user', 'name avatar frame userId isMale dateOfBirth')
    .sort({ _id: 1 })
    .lean()
    .skip((page - 1) * limit)
    .limit(limit);

  if (adminHost && page == 1) {
    hosts.unshift(adminHost);
  }

  // Transform hosts to handle deleted users
  const transformedHosts = userService.transformDeletedUsers(hosts, 'user');




  const totalHosts = await Host.countDocuments({ agency: agency.id });
  const calculatedPagination = calculatePagination(totalHosts, page, limit);
  return {
    agencyId: agency.id,
    hosts: transformedHosts,
    ...calculatedPagination,
  };
};

/**
 * Get data for an agency and its hosts for a specific day, including total expected salary.
 * @param {ObjectId} userId - The admin user ID
 * @param {Date} day - The specific day for which data is needed
 * @param page
 * @param limit
 * @returns {Promise<object>} - The agency data with hosts, their daily records, and total expected salary
 */

const getDailyAgencyData = async (userId, day = new Date(), page = 1, limit = 10) => {
  // Find the agency based on the admin user ID
  const agency = await Agency.findById(userId).select('name currentDiamonds id agencyId admin');
  if (!agency) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Agency not found', 'الوكالة غير موجودة');
  }

  // Calculate daily boundaries
  const dayStart = new Date(day).setHours(0, 0, 0, 0);
  const dayEnd = new Date(day).setHours(23, 59, 59, 999);

  // Calculate monthly boundaries using the provided day
  const currentDay = new Date(day);
  const monthStart = new Date(currentDay.getFullYear(), currentDay.getMonth(), 1);
  const monthEnd = new Date(currentDay.getFullYear(), currentDay.getMonth() + 1, 1); // first day of next month

  logger.info(day);

  // Aggregation pipeline to fetch hosts with both daily and monthly records
  const hostsWithDailyRecords = await Host.aggregate([
    // 1. Match hosts for the agency
    {
      $match: {
        agency: new mongoose.Types.ObjectId(agency.id),
      },
    },
    // 2. Populate the host document (if needed)
    {
      $lookup: {
        from: 'hosts',
        localField: '_id',
        foreignField: '_id',
        as: 'host',
      },
    },
    {
      $unwind: '$host',
    },
    // 3. Lookup and unwind the related user
    {
      $lookup: {
        from: 'users', // Assuming your users collection is named "users"
        localField: 'user',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $unwind: '$user',
    },
    // 4. Lookup the daily record for the specific day
    {
      $lookup: {
        from: 'hostdailyrecords',
        let: { hostId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$host', '$$hostId'] },
                  { $gte: ['$day', new Date(dayStart)] },
                  { $lt: ['$day', new Date(dayEnd)] },
                ],
              },
            },
          },
        ],
        as: 'dailyRecord',
      },
    },
    {
      $unwind: {
        path: '$dailyRecord',
        preserveNullAndEmptyArrays: true, // Include hosts even if there's no daily record
      },
    },
    // 5. Add daily fields with default values if not present
    {
      $addFields: {
        diamondsCollected: { $ifNull: ['$dailyRecord.diamondsCollected', 0] },
        expectedDailySalary: { $ifNull: ['$dailyRecord.expectedDailySalary', 0] },
      },
    },
    // 6. New lookup: Get the sum of diamonds collected for the month
    {
      $lookup: {
        from: 'hostdailyrecords',
        let: { hostId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$host', '$$hostId'] }, { $gte: ['$day', monthStart] }, { $lt: ['$day', monthEnd] }],
              },
            },
          },
          {
            $group: {
              _id: null,
              monthlyDiamondsCollected: { $sum: '$diamondsCollected' },
            },
          },
        ],
        as: 'monthlyRecord',
      },
    },
    // 7. Add the monthly diamonds collected field (defaulting to 0 if no records)
    {
      $addFields: {
        monthlyDiamondsCollected: {
          $ifNull: [{ $arrayElemAt: ['$monthlyRecord.monthlyDiamondsCollected', 0] }, 0],
        },
        monthlySalary: {
          $floor: {
            $multiply: [
              { $ifNull: [{ $arrayElemAt: ['$monthlyRecord.monthlyDiamondsCollected', 0] }, 0] },
              hostConfig.salaryConversionRates.hostDiamondToUSD,
            ],
          },
        },
      },
    },
    // 8. Project the required fields including the new monthly field
    {
      $project: {
        _id: 1,
        'user.name': 1,
        'user.avatar': 1,
        'user.frame': 1,
        'user._id': 1,
        'user.userId': 1,
        currentDiamonds: 1,
        diamondsCollected: 1,
        expectedDailySalary: 1,
        monthlyDiamondsCollected: 1,
        monthlySalary: 1,
      },
    },
    // 9. Sort by _id for consistent ordering
    {
      $sort: { _id: 1 },
    },
    // 10. Group to calculate the total expected salary across hosts
    {
      $group: {
        _id: null, // No grouping key because we're calculating a total
        totalExpectedSalary: { $sum: '$expectedDailySalary' },
        hosts: { $push: '$$ROOT' }, // Collect all host documents into an array
        totalMonthlyDiamonds: { $sum: '$monthlyDiamondsCollected' },
      },
    },
    // 11. Facet to handle pagination and count the total number of hosts
    {
      $facet: {
        hosts: [{ $skip: (page - 1) * limit }, { $limit: limit }],
        totalHosts: [
          {
            $count: 'totalHosts',
          },
        ],
      },
    },
  ]);

  // Extract hosts, total hosts, and calculate pagination
  const hosts = hostsWithDailyRecords[0].hosts[0]?.hosts || [];
  const totalHosts = hostsWithDailyRecords[0].totalHosts[0]?.totalHosts || 0;
  const totalMonthlyDiamonds = hostsWithDailyRecords[0].hosts[0]?.totalMonthlyDiamonds || 0;
  console.log(totalMonthlyDiamonds);
  console.log(hostsWithDailyRecords[0]);
  // calc total monthly diamonds for the whole agency

  const paginationData = calculatePagination(totalHosts, page, limit);

  return {
    agency: {
      ...agency.toObject(),
      totalMonthlyDiamonds,
      totalHosts,
    },
    ...paginationData,
    hosts,
  };
};

const getPublicAgencyData = async (agencyId) => {
  const agency = await Agency.findById(agencyId)
    .select('name agencyId id admin')
    .populate('admin', 'name avatar frame _id userId ');
  if (!agency) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Agency not found', 'الوكالة غير موجودة');
  }

  // Transform agency to handle deleted admin
  const transformedAgency = userService.transformDeletedUsers(agency, 'admin');

  const hostsCount = await Host.countDocuments({ agency: agencyId });
  return { agency: transformedAgency, hostsCount };
};
/**
 * Transfer cash to a user
 * @param {ObjectId} fromUserId - ID of the user sending cash
 * @param {ObjectId} toUserId - ID of the user receiving cash
 * @param {number} amount - Amount to transfer
 * @returns {Promise<object>} - The updated sender and recipient users
 * @throws {ApiError} - If the agency is not found or if the balance is insufficient
 */

const transferCashToUser = async (fromUserId, toUserId, amount) => {
  logger.info('transferCashToUser', fromUserId, toUserId, amount);
  const agency = await Agency.findOne({ admin: fromUserId }).select('currentDiamonds agencyId blockSalaryTransfer');
  if (!agency) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Agency not found', 'الوكالة غير موجودة');
  }
  if (agency.blockSalaryTransfer) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Salary transfer is blocked for this agency', 'تحويل الراتب محظور لهذه الوكالة');
  }
  const diamondsToBeDeducted = Math.floor(amount / hostConfig.salaryConversionRates.agencyDiamondToUSD);
  if (diamondsToBeDeducted > agency.currentDiamonds) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient balance', 'الرصيد غير كاف');
  }

  // Calculate diamonds to add to user (using agency transfer rate)
  const diamondsToBeAdded = Math.floor(amount / hostConfig.transferConversionRates.userDiamondToUSD);

  // Find the user and validate their existence
  const toUser = await User.findById(toUserId);
  if (!toUser) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }
  agency.currentDiamonds = Math.floor(agency.currentDiamonds - diamondsToBeDeducted);
  await agency.save(); // Save host updates
  await Promise.all([
    userService.increaseUserBalance(
      toUserId,
      diamondsToBeAdded,
      `transfer from agency ${agency.agencyId}`,
      `تحويل من وكالة ${agency.agencyId}`
    ), // Update user balance
    userService.logWalletTransaction(
      fromUserId,
      diamondsToBeAdded,
      'debit',
      `transfer to user ${toUser.userId}`,
      `تحويل إلى مستخدم ${toUser.userId}`
    ), // log wallet transaction for host
  ]);
  return {
    agency,
    USD: amount,
    diamondsToBeDeducted,
    diamondsToBeAdded,
    remainingDiamonds: agency.currentDiamonds,
  };
};

/**
 * Transfer cash to a credit agency
 * @param {ObjectId} fromUserId - ID of the user sending credits
 * @param {ObjectId} toCreditAgencyId - ID of the credit agency receiving credits
 * @param {number} amount - Amount to transfer
 * @returns {Promise<object>} - The updated sender and recipient credit agencies
 */

const transferCashToCreditAgency = async (fromUserId, toCreditAgencyId, amount) => {
  logger.info('transferCashToCreditAgency', fromUserId, toCreditAgencyId, amount);
  const agency = await Agency.findOne({ admin: fromUserId }).select('currentDiamonds agencyId blockSalaryTransfer');
  if (!agency) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Agency not found', 'الوكالة غير موجودة');
  }
  if (agency.blockSalaryTransfer) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Salary transfer is blocked for this agency', 'تحويل الراتب محظور لهذه الوكالة');
  }

  const diamondsToBeDeducted = Math.floor(amount / hostConfig.salaryConversionRates.agencyDiamondToUSD);
  if (diamondsToBeDeducted > agency.currentDiamonds) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient balance', 'الرصيد غير كاف');
  }

  const diamondsToBeAdded = Math.floor(amount / hostConfig.transferConversionRates.creditAgencyDiamondToUSD);

  agency.currentDiamonds = Math.floor(agency.currentDiamonds - diamondsToBeDeducted);

  const creditAgency = await creditAgencyService.receiveCredits(toCreditAgencyId, diamondsToBeAdded, fromUserId);
  console.log('creditAgency', creditAgency, creditAgency.name);
  await agency.save();
  await userService.logWalletTransaction(
    fromUserId,
    diamondsToBeAdded,
    'debit',
    `transfer to credit agency ${creditAgency?.name}`,
    `تحويل إلى وكالة شحن ${creditAgency?.name}`
  ); // log wallet transaction for host
  return { agency, USD: amount, diamondsToBeDeducted, diamondsToBeAdded, remainingDiamonds: agency.currentDiamonds };
};

const searchAgencies = async (query, page = 1, limit = 10) => {
  const name = query || '';
  const match = {};
  if (name.length > 0) {
    match.$or = [{ name: { $regex: name, $options: 'i' } }, { agencyId: name }];
  }

  const agencies = await Agency.find(match)
    .select('name agencyId admin createdAt ')
    .sort({ _id: 1 })
    .limit(limit)
    .skip(limit * (page - 1))
    .populate('admin', 'name userId avatar frame');

  // Transform agencies to handle deleted admins
  const transformedAgencies = userService.transformDeletedUsers(agencies, 'admin');

  // total amount
  const total = await Agency.countDocuments(match);
  const totalPages = Math.ceil(total / limit);
  return {
    list: transformedAgencies,
    next_page: page < totalPages ? page + 1 : null,
    page,
    limit,
    totalPages,
  };
};

const validateAgencyAdmin = async (userId, agencyId) => {
  const agId = agencyId?.toString();
  const agency = await Agency.findById(agId).select('admin name agencyId').lean();
  console.log(agency);
  if (!agency) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Agency not found', 'الوكالة غير موجودة');
  }
  if (agency.admin.toString() !== userId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'User is not authorized', 'المستخدم غير مصرح له');
  }
  return agency;
};

/**
 * Get agency's rank and total diamonds using a single aggregation
 * @param {string} agencyId - The ID of the agency
 * @returns {Promise<object>} - The rank and total diamonds
 */
const getAgencyMonthlyRank = async (agencyId) => {
  console.log('Calculating rank for agency:', agencyId);
  const { startOfMonth, endOfMonth } = getMonthDateRange();
  try {
    const result = await HostDailyRecord.aggregate([
      // Match records for current month
      {
        $match: {
          day: { $gte: startOfMonth, $lt: endOfMonth },
        },
      },
      // Group by agency and sum diamonds
      {
        $group: {
          _id: '$agency',
          totalDiamonds: { $sum: '$diamondsCollected' },
        },
      },
      // Sort by diamonds in descending order, with _id as tie breaker for consistent ordering
      {
        $sort: { totalDiamonds: -1, _id: 1 },
      },
      // Add array index as rank
      {
        $group: {
          _id: null,
          rankings: {
            $push: {
              agencyId: '$_id',
              totalDiamonds: '$totalDiamonds',
            },
          },
        },
      },
      // Unwind to process each rank
      {
        $unwind: {
          path: '$rankings',
          includeArrayIndex: 'rank',
        },
      },
      // Only keep the target agency's data
      {
        $match: {
          'rankings.agencyId': agencyId,
        },
      },
      // Format final output
      {
        $project: {
          _id: 0,
          rank: { $add: ['$rank', 1] },
          monthlyDiamonds: '$rankings.totalDiamonds',

        },
      },
    ]).exec();

    console.log('result', result);
    // if no result rank it the last on the agencies ( total agencies count)
    if (result.length === 0) {
      const totalAgencies = await Agency.countDocuments();
      return {
        rank: totalAgencies,
        monthlyDiamonds: 0,
        hostsMonthlySalary: 0,
      };
    }
    const hostsMonthlySalary = Math.floor(
      result[0]?.monthlyDiamonds * hostConfig.salaryConversionRates.hostDiamondToUSD || 0
    );

    return {
      rank: result[0]?.rank || 0,
      monthlyDiamonds: result[0]?.monthlyDiamonds || 0,
      hostsMonthlySalary,
    };
  } catch (error) {
    logger.error(`Error calculating rank for agency ${agencyId}:`, error);
    throw error;
  }
};

/**
 * Get comprehensive statistics for an agency
 * @param {ObjectId} agencyId - Agency ID
 * @returns {Promise<object>} - Agency statistics including hosts, diamonds, rankings, and performance metrics
 */
const getAgencyStatistics = async (agencyId) => {
  try {
    const agency = await Agency.findById(agencyId).select('name agencyId currentDiamonds admin');
    if (!agency) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Agency not found', 'الوكالة غير موجودة');
    }

    // Get current date ranges
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const endOfYear = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);

    // Get all hosts for this agency
    const hosts = await Host.find({ agency: agencyId }).select('_id user currentDiamonds').populate('user', 'name avatar userId');
    const hostIds = hosts.map(h => h._id);

    // Get comprehensive statistics using aggregation
    const [dailyStats, monthlyStats, yearlyStats, topPerformers, agencyRank] = await Promise.all([
      // Daily statistics
      HostDailyRecord.aggregate([
        {
          $match: {
            host: { $in: hostIds },
            day: { $gte: startOfDay, $lte: endOfDay }
          }
        },
        {
          $group: {
            _id: null,
            totalDailyDiamonds: { $sum: '$diamondsCollected' },
            totalDailySalary: { $sum: '$expectedDailySalary' },
            activeHosts: { $addToSet: '$host' }
          }
        }
      ]),

      // Monthly statistics
      HostDailyRecord.aggregate([
        {
          $match: {
            host: { $in: hostIds },
            day: { $gte: startOfMonth, $lte: endOfMonth }
          }
        },
        {
          $group: {
            _id: null,
            totalMonthlyDiamonds: { $sum: '$diamondsCollected' },
            totalMonthlySalary: { $sum: '$expectedDailySalary' },
            activeHosts: { $addToSet: '$host' }
          }
        }
      ]),

      // Yearly statistics
      HostDailyRecord.aggregate([
        {
          $match: {
            host: { $in: hostIds },
            day: { $gte: startOfYear, $lte: endOfYear }
          }
        },
        {
          $group: {
            _id: null,
            totalYearlyDiamonds: { $sum: '$diamondsCollected' },
            totalYearlySalary: { $sum: '$expectedDailySalary' },
            activeHosts: { $addToSet: '$host' }
          }
        }
      ]),

      // Top performing hosts (monthly)
      HostDailyRecord.aggregate([
        {
          $match: {
            host: { $in: hostIds },
            day: { $gte: startOfMonth, $lte: endOfMonth }
          }
        },
        {
          $group: {
            _id: '$host',
            monthlyDiamonds: { $sum: '$diamondsCollected' },
            monthlySalary: { $sum: '$expectedDailySalary' }
          }
        },
        {
          $lookup: {
            from: 'hosts',
            localField: '_id',
            foreignField: '_id',
            as: 'host'
          }
        },
        {
          $unwind: '$host'
        },
        {
          $lookup: {
            from: 'users',
            localField: 'host.user',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: '$user'
        },
        {
          $project: {
            _id: 1,
            monthlyDiamonds: 1,
            monthlySalary: 1,
            'user.name': 1,
            'user.avatar': 1,
            'user.userId': 1,
            'host.currentDiamonds': 1
          }
        },
        {
          $sort: { monthlyDiamonds: -1 }
        },
        {
          $limit: 10
        }
      ]),

      // Agency rank
      getAgencyMonthlyRank(agencyId)
    ]);

    // Calculate additional metrics
    const totalHosts = hosts.length;
    const dailyActiveHosts = dailyStats[0]?.activeHosts?.length || 0;
    const monthlyActiveHosts = monthlyStats[0]?.activeHosts?.length || 0;
    const yearlyActiveHosts = yearlyStats[0]?.activeHosts?.length || 0;

    // Calculate performance metrics
    const avgDiamondsPerHost = totalHosts > 0 ? Math.round(agency.currentDiamonds / totalHosts) : 0;
    const monthlyAvgDiamondsPerActiveHost = monthlyActiveHosts > 0 ?
      Math.round((monthlyStats[0]?.totalMonthlyDiamonds || 0) / monthlyActiveHosts) : 0;

    // Calculate growth rates (simplified)
    const dailyGrowthRate = totalHosts > 0 ?
      Math.round(((dailyStats[0]?.totalDailyDiamonds || 0) / totalHosts) * 100) / 100 : 0;

    // Agency performance level based on current diamonds
    let performanceLevel = 'مبتدئ';
    if (agency.currentDiamonds > 100000) performanceLevel = 'خبير';
    else if (agency.currentDiamonds > 50000) performanceLevel = 'متقدم';
    else if (agency.currentDiamonds > 10000) performanceLevel = 'متوسط';

    return {
      agency: {
        id: agency._id,
        name: agency.name,
        agencyId: agency.agencyId,
        currentDiamonds: agency.currentDiamonds,
        currentSalary: calculateAgencySalary(agency.currentDiamonds),
        performanceLevel
      },
      statistics: {
        hosts: {
          total: totalHosts,
          dailyActive: dailyActiveHosts,
          monthlyActive: monthlyActiveHosts,
          yearlyActive: yearlyActiveHosts,
          activeRate: totalHosts > 0 ? Math.round((monthlyActiveHosts / totalHosts) * 100) : 0
        },
        diamonds: {
          current: agency.currentDiamonds,
          daily: dailyStats[0]?.totalDailyDiamonds || 0,
          monthly: monthlyStats[0]?.totalMonthlyDiamonds || 0,
          yearly: yearlyStats[0]?.totalYearlyDiamonds || 0,
          avgPerHost: avgDiamondsPerHost,
          monthlyAvgPerActiveHost: monthlyAvgDiamondsPerActiveHost
        },
        salary: {
          current: calculateAgencySalary(agency.currentDiamonds),
          daily: dailyStats[0]?.totalDailySalary || 0,
          monthly: monthlyStats[0]?.totalMonthlySalary || 0,
          yearly: yearlyStats[0]?.totalYearlySalary || 0
        },
        performance: {
          rank: agencyRank.rank,
          dailyGrowthRate,
          level: performanceLevel
        }
      },
      topPerformers: userService.transformDeletedUsers(topPerformers, 'user')
    };
  } catch (error) {
    logger.error(`Error getting agency statistics for ${agencyId}:`, error);
    throw error;
  }
};

module.exports = {
  createAgency,
  getAgencyById,
  addHostToAgency,
  removeHostFromAgency,
  getAgencyData,
  getAgencyByAdminId,
  transferCashToCreditAgency,
  transferCashToUser,
  searchAgencies,
  validateAgencyAdmin,
  getPublicAgencyData,
  getDailyAgencyData,
  manageHosts,
  getAgencyMonthlyRank,
  calculateAgencySalary,
  getAgencies,
  getAgencyStatistics,
};
