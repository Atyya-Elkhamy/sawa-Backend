const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const {
  hostAgencyService,
  hostService,
  hostActivityService,
  hostInviteService,
  userService,
  creditAgencyService,
} = require('../services');
const ApiError = require('../utils/ApiError');
const Agency = require('../models/agencies/hostAgency.model');

// get all agencies
const getAgencies = catchAsync(async (req, res) => {
  const { page, limit } = req.query;
  const data = await hostAgencyService.getAgencies(Number(page) || 1, Number(limit) || 15);
  res.status(httpStatus.OK).send(data);
});
/**
 * Create a new agency
 */
const createAgency = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const agency = await hostAgencyService.createAgency({
    ...req.body,
    admin: userId,
  });
  res.status(httpStatus.CREATED).send({
    status: 'success',
    message: 'Agency created successfully',
    messageAr: 'تم إنشاء الوكالة بنجاح',
    data: agency,
  });
});

/**
 * Get agency by ID
 */
const getAgency = catchAsync(async (req, res) => {
  const agency = await hostAgencyService.getAgencyById(req.params.agencyId);
  res.status(httpStatus.OK).send(agency);
});

/**
 * Add a host to the agency
 */
const addHost = catchAsync(async (req, res) => {
  const agency = await hostAgencyService.addHostToAgency(req.params.agencyId, req.body.userId);
  res.status(httpStatus.OK).send(agency);
});

/**
 * Get agency statistics
 */
const getAgencyStatistics = catchAsync(async (req, res) => {
  const stats = await hostAgencyService.getAgencyStatistics(req.params.agencyId);
  res.status(httpStatus.OK).send(stats);
});

/**
 * Get comprehensive agency analytics for admin
 */
const getAgencyAnalytics = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const agency = await hostAgencyService.getAgencyByAdminId(userId);
  const stats = await hostAgencyService.getAgencyStatistics(agency._id);
  res.status(httpStatus.OK).send({
    status: 'success',
    data: stats,
  });
});

const getHostData = catchAsync(async (req, res) => {
  const data = await hostService.getHostData(req.user.id);
  res.status(httpStatus.OK).send(data);
});

const getSalaryData = catchAsync(async (req, res) => {
  const host = await hostService.getHostDataByUserId(req.user.id, 'currentDiamonds');
  const data = await hostService.getHostSalary(host.currentDiamonds);

  const cashback = 0;
  res.status(httpStatus.OK).send({
    ...data,
    cashback,
    host,
  });
});

const transferCash = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const formatedId = req.user.userId;
  const { toUserId, toCreditAgencyId, amount } = req.body;
  let result;

  if (toUserId) {
    // check if the user has a credit agency
    const chargeAgency = await creditAgencyService.getCreditAgency(toUserId);

    if (!chargeAgency) {
      result = await hostService.transferCashToUser(userId, toUserId, amount, formatedId);
    } else {
      result = await hostService.transferCashToCreditAgency(userId, chargeAgency._id, amount, formatedId);
    }
  } else if (toCreditAgencyId) {
    result = await hostService.transferCashToCreditAgency(userId, toCreditAgencyId, amount, formatedId);
  }
  res.status(httpStatus.OK).send({
    status: 'success',
    message: 'Cash transferred successfully',
    messageAr: 'تم تحويل النقود بنجاح',
    data: result,
  });
});
const agencyTransferCash = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { toUserId, toCreditAgencyId, amount } = req.body;
  let result;
  if (toUserId) {
    const chargeAgency = await creditAgencyService.getCreditAgency(toUserId);
    if (!chargeAgency) {
      result = await hostAgencyService.transferCashToUser(userId, toUserId, amount);
    } else {
      result = await hostAgencyService.transferCashToCreditAgency(userId, chargeAgency._id, amount);
    }
  } else if (toCreditAgencyId) {
    result = await hostAgencyService.transferCashToCreditAgency(userId, toCreditAgencyId, amount);
  }
  res.status(httpStatus.OK).send({
    status: 'success',
    message: 'Cash transferred successfully',
    messageAr: 'تم تحويل النقود بنجاح',
    data: result,
  });
});

const getAgencyData = catchAsync(async (req, res) => {
  const data = await hostAgencyService.getAgencyData(req.user.id);
  res.status(httpStatus.OK).send(data);
});
const manageHosts = catchAsync(async (req, res) => {
  if (!req.user.id) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User ID is required', 'مطلوب معرف المستخدم');
  }
  const { page, limit } = req.query;
  const data = await hostAgencyService.manageHosts(req.user.id, Number(page) || 1, Number(limit) || 15);
  res.status(httpStatus.OK).send(data);
});

const getPublicAgencyData = catchAsync(async (req, res) => {
  const data = await hostAgencyService.getPublicAgencyData(req.params.agencyId);
  res.status(httpStatus.OK).send(data);
});

const getHostHistory = catchAsync(async (req, res) => {
  const host = await hostService.getHostDataByUserId(req.user.id);
  const { day } = req.query; // 1

  const date = `${new Date().getFullYear()}/${new Date().getMonth() + 1}/${day}` || new Date();
  const data = await hostActivityService.getTargetStatsForHost(host._id, date);
  res.status(httpStatus.OK).send(data);
});
const getAgencyHistory = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const agency = await Agency.findOne({ admin: userId });

  if (!agency) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User is not an admin of any agency', 'المستخدم ليس مسؤولًا عن أي وكالة');
  }
  const agencyId = agency._id?.toString();
  const { day, page, limit } = req.query; // 1

  const date = `${new Date().getFullYear()}/${new Date().getMonth() + 1}/${day}` || new Date();

  if (!agencyId) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User is not a host of any agency', 'المستخدم ليس مضيفًا لأي وكالة');
  }

  // const data = await hostAgencyService.getDailyAgencyData(agencyId, date, Number(page) || 1, Number(limit) || 15);
  const data = await hostAgencyService.getDailyAgencyData(agencyId, date, Number(page) || 1, Number(limit) || 15);

  // paginated host data
  res.status(httpStatus.OK).send(data);
});
const searchAgencies = catchAsync(async (req, res) => {
  const { query } = req.query;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;

  const agencies = await hostAgencyService.searchAgencies(query, page, limit);
  res.send({ data: agencies });
});

const getAgencyPendingInvitations = catchAsync(async (req, res) => {
  const { agencyId } = req.body;
  const { limit = 10, page = 1 } = req.query;
  await hostAgencyService.validateAgencyAdmin(req.user.id, agencyId);
  const result = await hostInviteService.getAgencyInvitations(agencyId, 'pending', limit, page);
  res.status(httpStatus.OK).send(result);
});

// Get rejected invitations for the agency
const getAgencyRejectedInvitations = catchAsync(async (req, res) => {
  const { agencyId } = req.body;
  const { limit = 10, page = 1 } = req.query;
  await hostAgencyService.validateAgencyAdmin(req.user.id, agencyId);
  const result = await hostInviteService.getAgencyInvitations(agencyId, 'denied', limit, page);
  res.status(httpStatus.OK).send(result);
});

const getAgencyInvitations = catchAsync(async (req, res) => {
  const { agencyId } = req.body;
  const { limit = 10, page = 1 } = req.query;
  await hostAgencyService.validateAgencyAdmin(req.user.id, agencyId);
  const result = await hostInviteService.getAgencyInvitations(agencyId, null, limit, page);
  res.status(httpStatus.OK).send(result);
});

// Get pending requests for the agency
const getAgencyPendingRequests = catchAsync(async (req, res) => {
  const { agencyId } = req.body;
  const { limit = 10, page = 1 } = req.query;
  await hostAgencyService.validateAgencyAdmin(req.user.id, agencyId);
  const result = await hostInviteService.getAgencyRequests(agencyId, 'pending', limit, page);
  res.status(httpStatus.OK).send(result);
});

// Get rejected requests for the agency
const getAgencyRejectedRequests = catchAsync(async (req, res) => {
  const { agencyId } = req.body;
  const { limit = 10, page = 1 } = req.query;
  await hostAgencyService.validateAgencyAdmin(req.user.id, agencyId);
  const result = await hostInviteService.getAgencyRequests(agencyId, 'denied', limit, page);
  res.status(httpStatus.OK).send(result);
});

const getAgencyAcceptedRequests = catchAsync(async (req, res) => {
  const { agencyId } = req.body;
  const { limit = 10, page = 1 } = req.query;
  await hostAgencyService.validateAgencyAdmin(req.user.id, agencyId);
  const result = await hostInviteService.getAgencyRequests(agencyId, 'accepted', limit, page);
  res.status(httpStatus.OK).send(result);
});

const getAgencyAcceptedInvites = catchAsync(async (req, res) => {
  const { agencyId } = req.body;
  const { limit = 10, page = 1 } = req.query;
  await hostAgencyService.validateAgencyAdmin(req.user.id, agencyId);
  const result = await hostInviteService.getAgencyInvitations(agencyId, 'accepted', limit, page);
  res.status(httpStatus.OK).send(result);
});

// Invite user to agency
const inviteUser = catchAsync(async (req, res) => {
  const { userId, agencyId } = req.body;
  if (userId === req.user.id) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'You cannot invite yourself', 'لا يمكنك دعوة نفسك');
  }
  const host = await hostService.checkIfUserIsHost(userId, true);
  if (host) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User is already a host', 'المستخدم مضيف بالفعل');
  }
  const isFriend = await userService.isFriend(req.user.id, userId);
  if (!isFriend) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User is not a friend', 'المستخدم ليس صديقًا');
  }
  const agency = await hostAgencyService.validateAgencyAdmin(req.user.id, agencyId);
  const result = await hostInviteService.inviteUserToAgency(agencyId, userId, agency, req.user.id);
  res.status(httpStatus.CREATED).send({
    status: 'success',
    message: 'User invited successfully',
    messageAr: 'تم دعوة المستخدم بنجاح',
    data: result,
  });
});
const removeInvite = catchAsync(async (req, res) => {
  const { requestId } = req.body;
  const result = await hostInviteService.removePendingInvite(requestId, req.user.id);
  res.status(httpStatus.NO_CONTENT).send(result);
});
// Submit a join request to an agency
const joinAgencyRequest = catchAsync(async (req, res) => {
  const { agencyId } = req.body;
  const userId = req.user.id;
  const host = await hostService.checkIfUserIsHost(userId, true);
  if (host) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User is already a host', 'المستخدم مضيف بالفعل');
  }
  const result = await hostInviteService.submitJoinRequest(agencyId, userId);
  res.status(httpStatus.CREATED).send({
    status: 'success',
    message: 'Join request submitted successfully',
    messageAr: 'تم إرسال طلب الانضمام بنجاح',
    data: result,
  });
});

// Accept a join request
const acceptJoinRequest = catchAsync(async (req, res) => {
  const { requestId } = req.body;
  const result = await hostInviteService.acceptJoinRequest(requestId, req.user.id);
  res.status(httpStatus.OK).send(result);
});

// Deny a join request
const denyJoinRequest = catchAsync(async (req, res) => {
  const result = await hostInviteService.denyJoinRequest(req.body.requestId, req.user.id);
  res.status(httpStatus.OK).send(result);
});

/**
 * Get pending invitations for a user by ID
 */
const getUserPendingInvitations = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { limit = 10, page = 1 } = req.query;
  const result = await hostInviteService.getUserInvitations(userId, 'pending', limit, page);
  res.status(200).send(result);
});
const getUserRequests = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { limit = 10, page = 1 } = req.query;
  const result = await hostInviteService.getUserRequests(userId, null, limit, page);
  res.status(200).send(result);
});
/**
 * Get rejected invitations for a user by ID
 */
const getUserRejectedInvitations = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { limit = 10, page = 1 } = req.query;
  const result = await hostInviteService.getUserInvitations(userId, 'denied', limit, page);
  res.status(200).send(result);
});

/**
 * Get pending join requests for a user by ID
 */
const getUserPendingRequests = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { limit = 10, page = 1 } = req.query;
  const result = await hostInviteService.getUserRequests(userId, 'pending', limit, page);
  res.status(200).send(result);
});

/**
 * Get rejected join requests for a user by ID
 */
const getUserRejectedRequests = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { limit = 10, page = 1 } = req.query;
  const result = await hostInviteService.getUserRequests(userId, 'denied', limit, page);
  res.status(200).send(result);
});

const acceptInvite = catchAsync(async (req, res) => {
  const { agencyId } = req.body;
  const userId = req.user.id;
  const result = await hostInviteService.acceptInvite(agencyId, userId);
  res.status(httpStatus.OK).send({
    status: 'success',
    message: 'Invite accepted successfully',
    messageAr: 'تم قبول الدعوة بنجاح',
    data: result,
  });
});

const denyInvite = catchAsync(async (req, res) => {
  const { agencyId } = req.body;
  const userId = req.user.id;
  const result = await hostInviteService.denyInvite(agencyId, userId);
  res.status(httpStatus.OK).send({
    status: 'success',
    message: 'Invite denied successfully',
    messageAr: 'تم رفض الدعوة بنجاح',
    data: result,
  });
});

const removeHost = catchAsync(async (req, res) => {
  const { hostId, agencyId } = req.body;
  await hostAgencyService.validateAgencyAdmin(req.user.id, agencyId);
  await hostAgencyService.removeHostFromAgency(agencyId, hostId, req.user.id);
  res.status(httpStatus.OK).send({
    status: 'success',
    message: 'Host removed successfully',
    messageAr: 'تمت إزالة المضيف بنجاح',
  });
});
const cancelJoinRequest = catchAsync(async (req, res) => {
  const { agencyId } = req.body;
  const userId = req.user.id;
  const result = await hostInviteService.cancelJoinRequest(agencyId, userId);
  res.status(httpStatus.OK).send({
    status: 'success',
    message: 'Join request cancelled successfully',
    messageAr: 'تم إلغاء طلب الانضمام بنجاح',
    data: result,
  });
});
const getAgencyRank = catchAsync(async (req, res) => {
  const adminId = req.user.id;
  const agency = await hostAgencyService.getAgencyByAdminId(adminId);
  console.log('agency', agency);
  const data = await hostAgencyService.getAgencyMonthlyRank(agency._id);
  const host = await hostService.getHostDataByUserId(req.user.id, 'currentDiamonds');
  const hostSalary = await hostService.getHostSalary(host.currentDiamonds);
  const hostData = {
    ...host?.toObject(),
    salary: hostSalary,
  };
  data.currentDiamonds = agency.currentDiamonds;
  data.host = hostData;
  data.Salary = hostAgencyService.calculateAgencySalary(data.currentDiamonds);
  res.status(httpStatus.OK).send(data);
});

module.exports = {
  createAgency,
  getAgencyHistory,
  getAgency,
  addHost,
  getAgencyStatistics,
  getAgencyAnalytics,
  getHostData,
  getSalaryData,
  transferCash,
  getAgencyData,
  agencyTransferCash,
  getHostHistory,
  searchAgencies,
  getPublicAgencyData,
  inviteUser,
  joinAgencyRequest,
  removeInvite,
  acceptJoinRequest,
  denyJoinRequest,
  getAgencyPendingInvitations,
  getAgencyRejectedInvitations,
  getAgencyPendingRequests,
  getAgencyRejectedRequests,
  getUserPendingInvitations,
  getAgencyInvitations,
  getUserRejectedInvitations,
  getUserPendingRequests,
  getUserRejectedRequests,
  acceptInvite,
  denyInvite,
  removeHost,
  getAgencyAcceptedRequests,
  getAgencyAcceptedInvites,
  cancelJoinRequest,
  getAgencyRank,
  manageHosts,
  getUserRequests,
  getAgencies,
};
