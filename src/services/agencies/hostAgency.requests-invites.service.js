const mongoose = require('mongoose');
const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');
const { HostAgencyRequest, HostAgencyInvite } = require('../../models');
const { User } = require('../../models');
const hostAgencyService = require('./hostAgency.service');
const chatService = require('../chat/chat.service');
/**
 * Invite user to an agency
 * @param agencyId
 * @param userId
 * @param agency
 * @param senderId
 */

const inviteUserToAgency = async (agencyId, userId, agency, senderId) => {
  const existingInvite = await HostAgencyInvite.findOne({
    user: userId,
    agency: agencyId,
    status: 'pending',
    createdAt: { $gt: new Date(new Date() - 3 * 24 * 60 * 60 * 1000) },
  });
  if (existingInvite) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invite already sent.', 'تم إرسال الدعوة بالفعل');
  }

  const invite = new HostAgencyInvite({
    user: userId,
    agency: agencyId,
  });
  const invitation = {
    body: `You have been invited to join ${agency.name} agency.`,
    bodyAr: `لا تضيع الفرصه لقد تمت دعوتك للانضمام الى وكاله ${agency.name}`,
    invitationType: chatService.INVITATION_TYPES.AGENCY,
    invitationId: agencyId,
  };

  await chatService.sendInvitationMessage({
    senderId,
    receiverId: userId,
    invitation,
  });
  await invite.save();

  return invite;
};

/**
 * Submit a join request to the agency
 * @param agencyId
 * @param userId
 */
const submitJoinRequest = async (agencyId, userId) => {
  const existingRequest = await HostAgencyRequest.findOne({
    user: userId,
    agency: agencyId,
    status: 'pending',
  });
  if (existingRequest) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Request already submitted.', 'تم تقديم الطلب بالفعل');
  }

  const request = new HostAgencyRequest({
    user: userId,
    agency: agencyId,
  });
  await request.save();

  return request;
};

/**
 * Aggregate pending invitations and join requests
 * @param agencyId
 * @param limit
 * @param page
 */
const getPendingInvitesAndRequests = async (agencyId, limit = 10, page = 1) => {
  const skip = (page - 1) * limit;

  const [invites, requests] = await Promise.all([
    HostAgencyInvite.aggregate([
      {
        $match: {
          agency: new mongoose.Types.ObjectId(agencyId),
          status: 'pending',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userDetails',
        },
      },
      { $unwind: '$userDetails' },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          id: '$userDetails._id',
          name: '$userDetails.name',
          avatar: '$userDetails.avatar',
        },
      },
    ]),
    HostAgencyRequest.aggregate([
      {
        $match: {
          agency: new mongoose.Types.ObjectId(agencyId),
          status: 'pending',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userDetails',
        },
      },
      { $unwind: '$userDetails' },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          id: '$userDetails._id',
          name: '$userDetails.name',
          avatar: '$userDetails.avatar',
        },
      },
    ]),
  ]);

  return {
    invites,
    requests,
    totalInvites: invites.length,
    totalRequests: requests.length,
    totalPages: Math.ceil((invites.length + requests.length) / limit),
    currentPage: page,
  };
};

/**
 * Remove a pending invite
 * @param agencyId
 * @param userId
 * @param requestId
 * @param admin
 */
const removePendingInvite = async (requestId, admin) => {
  const invite = await HostAgencyInvite.findById(requestId);

  if (!invite) {
    throw new Error('Invite not found or already accepted/denied.');
  }

  const agencyId = invite.agency;

  // check if the user is the admin of the agency
  await hostAgencyService.validateAgencyAdmin(admin, agencyId);

  await invite.deleteOne();

  return invite;
};

/**
 * Accept a join request
 * @param agencyId
 * @param userId
 * @param requestId
 * @param admin
 */
const acceptJoinRequest = async (requestId, admin) => {
  const request = await HostAgencyRequest.findOne({
    _id: requestId,
    status: 'pending',
  });

  console.log(request);

  if (!request) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No pending join request found.', 'لم يتم العثور على طلب انضمام معلق');
  }
  const agencyId = request.agency?.toString();
  console.log('agencyId', agencyId);
  const userId = request.user?.toString();
  // check if the user is the admin of the agency
  await hostAgencyService.validateAgencyAdmin(admin, agencyId?.toString());

  const user = await User.findById(userId).select('host hostAgency');
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found.', 'المستخدم غير موجود');
  }


  if (user.host || user.hostAgency) {
    // check is same host agency
    if (user.hostAgency && user.hostAgency.toString() === agencyId) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'User is already a host in the same agency.',
        'المستخدم مضاف بالفعل كمضيف في نفس الوكالة'
      );
    }
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'User is already a host or belongs to an agency.',
      'المستخدم مضاف بالفعل كمضيف أو ينتمي إلى وكالة'
    );
  }

  request.status = 'accepted';

  // Add user to Host model instead of agency
  await hostAgencyService.addHostToAgency(agencyId, userId);
  await request.save();

  // Remove all other pending invites and requests for this user
  await HostAgencyInvite.deleteMany({
    user: userId,
    status: 'pending'
  });
  await HostAgencyRequest.deleteMany({
    user: userId,
    status: 'pending'
  });

  return request;
};

/**
 * Deny a join request
 * @param agencyId
 * @param userId
 * @param requestId
 * @param admin
 */
const denyJoinRequest = async (requestId, admin) => {
  const request = await HostAgencyRequest.findOne({
    _id: requestId,
    status: 'pending',
  });

  if (!request) {
    throw new Error('No pending join request found.');
  }

  // check if the user is the admin of the agency
  await hostAgencyService.validateAgencyAdmin(admin, request.agency);

  request.status = 'denied';
  await request.save();

  return request;
};

/**
 * Get pending and rejected invitations for an agency
 * @param agencyId
 * @param status
 * @param limit
 * @param page
 */
const getAgencyInvitations = async (agencyId, status = null, limit = 10, page = 1) => {
  const skip = (page - 1) * limit;
  const limitInt = parseInt(limit, 10);
  const match = {
    agency: new mongoose.Types.ObjectId(agencyId),
    status: status || { $ne: 'accepted' },
  };
  const invites = await HostAgencyInvite.aggregate([
    { $match: match },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'userDetails',
      },
    },
    { $unwind: '$userDetails' },
    // get agency details
    {
      $lookup: {
        from: 'agencies',
        localField: 'agency',
        foreignField: '_id',
        as: 'agencyDetails',
      },
    },
    { $unwind: '$agencyDetails' },
    { $sort: { createdAt: -1 } }, // Sort by the latest
    { $skip: skip },
    { $limit: limitInt },
    {
      $project: {
        id: '$userDetails._id',
        name: '$userDetails.name',
        avatar: '$userDetails.avatar',
        userId: '$userDetails.userId',
        frame: '$userDetails.frame',
        dateOfBirth: '$userDetails.dateOfBirth',
        isMale: '$userDetails.isMale',
        agencyId: '$agencyDetails.agencyId',
        status: 1,
        createdAt: 1,
      },
    },
  ]);

  const totalInvites = await HostAgencyInvite.countDocuments({
    agency: agencyId,
    status,
  });
  const totalPages = Math.ceil(totalInvites / limit);
  return {
    list: invites,
    totalPages,
    totalResults: totalInvites,
    currentPage: page,
    nextPage: page < totalPages ? page + 1 : null,
    limit,
    page,
  };
};

/**
 * Get pending and rejected join requests for an agency
 * @param agencyId
 * @param status
 * @param limit
 * @param page
 */
const getAgencyRequests = async (agencyId, status = 'pending', limit = 10, page = 1) => {

  const skip = (page - 1) * limit;
  const limitInt = parseInt(limit, 10);

  const match = {
    agency: new mongoose.Types.ObjectId(agencyId),
    status,
  };

  const requests = await HostAgencyRequest.aggregate([
    { $match: match },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'userDetails',
      },
    },
    { $unwind: '$userDetails' },
    { $sort: { createdAt: -1 } }, // Sort by latest
    { $skip: skip },
    { $limit: limitInt },
    {
      $project: {
        id: '$userDetails._id',
        userId: '$userDetails.userId',
        name: '$userDetails.name',
        avatar: '$userDetails.avatar',
        frame: '$userDetails.frame',
        dateOfBirth: '$userDetails.dateOfBirth',
        isMale: '$userDetails.isMale',
        status: 1,
        createdAt: 1,
      },
    },
  ]);

  const totalRequests = await HostAgencyRequest.countDocuments({
    agency: agencyId,
    status,
  });
  const totalPages = Math.ceil(totalRequests / limitInt);
  return {
    list: requests,
    totalPages,
    totalResults: totalRequests,
    currentPage: page,
    nextPage: page < totalPages ? page + 1 : null,
    limit,
    page,
  };
};

/**
 * Get pending and rejected invitations for a user by user ID
 * @param userId
 * @param status
 * @param limit
 * @param page
 */
const getUserInvitations = async (userId, status = 'pending', limit = 10, page = 1) => {
  const skip = (page - 1) * limit;
  const limitInt = parseInt(limit, 10);

  const match = {
    user: new mongoose.Types.ObjectId(userId),
    status,
  };

  const invitations = await HostAgencyInvite.find(match)
    .populate([
      {
        path: 'agency',
        select: 'name admin',
        populate: {
          path: 'admin',
          select: 'name avatar',
        },
      },
    ])
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitInt);

  const totalInvitations = await HostAgencyInvite.countDocuments(match);
  const totalPages = Math.ceil(totalInvitations / limitInt);

  const validInvitations = invitations.filter(invite => invite.agency && invite.agency.admin);

  const projectedList = validInvitations.map((request) => {
    const { agency } = request || {
      agency: {
        name: '',
        _id: '',
        agencyId: '',
        admin: {
          avatar: '',
        },
      },
    };
    return {
      agencyId: agency?._id || agency?.id,
      agencyName: agency?.name,
      image: agency?.admin?.avatar,
      createdAt: request.createdAt,
      status: request.status,
    };
  });
  return {
    list: projectedList,
    totalPages,
    totalResults: totalInvitations,
    currentPage: page,
    nextPage: page < totalPages ? page + 1 : null,
    limit,
    page,
  };
};

/**
 * Get pending and rejected join requests for a user by user ID
 * @param userId
 * @param status
 * @param limit
 * @param page
 */
const getUserRequests = async (userId, status = null, limit = 10, page = 1) => {
  const skip = (page - 1) * limit;
  const limitInt = parseInt(limit, 10);
  const match = {
    user: new mongoose.Types.ObjectId(userId),
    status: status || { $ne: 'accepted' },
  };
  const requests = await HostAgencyRequest.find(match)
    .populate([
      {
        path: 'agency',
        select: 'name admin agencyId _id',
        populate: {
          path: 'admin',
          select: 'name avatar',
        },
      },
    ])
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitInt);

  // Filter out requests where agency doesn't exist
  const validRequests = requests.filter(request => request.agency);
  // Project the necessary fields
  const projectedList = validRequests.map((request) => {
    const { agency } = request;
    if (!agency || !agency?.admin) {
      // skip if agency is not found
      return null;
    }

    return {
      agency_id: agency?._id || agency?.id,
      agencyId: agency?.agencyId,
      agencyName: agency?.name,
      image: agency?.admin?.avatar,
      createdAt: request.createdAt,
      status: request.status,
    };
  });
  const totalRequests = await HostAgencyRequest.countDocuments(match);
  const totalPages = Math.ceil(totalRequests / limitInt);
  return {
    list: projectedList,
    totalPages,
    totalResults: totalRequests,
    currentPage: page,
    nextPage: page < totalPages ? page + 1 : null,
    limit,
    page,
  };
};

const acceptInvite = async (agencyId, userId) => {
  const invite = await HostAgencyInvite.findOne({
    user: userId,
    agency: agencyId,
    status: 'pending',
  });

  if (!invite) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No pending invite found.', 'لم يتم العثور على دعوة معلقة');
  }

  invite.status = 'accepted';
  // Add user to Host model instead of agency
  await hostAgencyService.addHostToAgency(agencyId, userId);

  await invite.save();

  // Remove all other pending invites and requests for this user
  await HostAgencyInvite.deleteMany({
    user: userId,
    status: 'pending'
  });
  await HostAgencyRequest.deleteMany({
    user: userId,
    status: 'pending'
  });

  return invite;
};

const denyInvite = async (agencyId, userId) => {
  const invite = await HostAgencyInvite.findOne({
    user: userId,
    agency: agencyId,
    status: 'pending',
  });

  if (!invite) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No pending invite found.', 'لم يتم العثور على دعوة معلقة');
  }

  invite.status = 'denied';
  await invite.save();
};
const cancelJoinRequest = async (agencyId, userId) => {
  const request = await HostAgencyRequest.findOne({
    user: userId,
    agency: agencyId,
    status: 'pending',
  });

  if (!request) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No pending request found.', 'لم يتم العثور على طلب معلق');
  }

  await request.deleteOne();
};

module.exports = {
  getAgencyInvitations,
  getAgencyRequests,
  getUserInvitations,
  getUserRequests,
  inviteUserToAgency,
  submitJoinRequest,
  getPendingInvitesAndRequests,
  removePendingInvite,
  acceptJoinRequest,
  denyJoinRequest,
  acceptInvite,
  denyInvite,
  cancelJoinRequest,
};
