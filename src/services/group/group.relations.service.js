const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');
const GroupRelation = require('../../models/invites-requests/group.relation.model');
const { Group, User } = require('../../models');
const groupService = require('./group.service');
const logger = require('../../config/logger');
const chatService = require('../chat/chat.service');
const sendToUser = require('../chat/messageSender').sendToUser;

// const getRequests = async (groupId, page = 1, limit = 10) => {
//   logger.info('Getting requests');
//   logger.info(groupId);
//   logger.info(page);
//   logger.info(limit);
//   const { results, itemCount } = await GroupRelation.paginateRequests(groupId, page, limit);
//   logger.info('Results');
//   logger.info(results);
//   logger.info(itemCount);
//   const totalPages = Math.ceil(itemCount / limit);
//   return {
//     list: results || [],
//     total: itemCount || 0,
//     page,
//     limit,
//     nextPage: totalPages > page ? page + 1 : null,
//     totalPages: totalPages || 0,
//   };
// };

const getRequests = async (groupId, page = 1, limit = 10) => {
  const { results, itemCount } = await GroupRelation.paginateRequests(groupId, page, limit);
  // Efficiently keep only unique users
  const seen = new Set();
  const uniqueResults = results.filter(rel => {
    const userId = rel.user.toString();
    if (seen.has(userId)) return false;
    seen.add(userId);
    return true;
  });
  // Adjust total count for unique users
  const totalUnique = uniqueResults.length;
  const totalPages = Math.ceil(totalUnique / limit);
  return {
    list: uniqueResults,
    total: totalUnique,
    page,
    limit,
    nextPage: totalPages > page ? page + 1 : null,
    totalPages: totalPages || 0,
  };
};


const sendRequest = async (groupId, userId) => {
  const group = await Group.findById(groupId);
  if (!group) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Group not found ', 'المجموعة غير موجودة');
  }
  const user = await User.findById(userId).select('group');
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }
  if (user.group) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User is already in a group', 'المستخدم موجود بالفعل في مجموعة');
  }
  const relation = await GroupRelation.findOne({
    user: userId,
    group: groupId,
    type: 'request',
    status: 'pending',
  });
  if (relation) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Request already sent', 'تم إرسال الطلب بالفعل');
  }
  const request = new GroupRelation({
    user: userId,
    group: groupId,
    type: 'request',
  });
  await request.save();
};
// const joinGroup = async (groupId, userId) => {
//   const group = await Group.findById(groupId).select('members open');
//   if (!group) {
//     throw new ApiError(httpStatus.NOT_FOUND, 'Group not found', 'المجموعة غير موجودة');
//   }
//   if (group.open) {
//     const groupd = await groupService.addMemberToGroup(groupId, userId);
//     const data = {
//       groupd,
//       message: 'You have joined the group successfully',
//       messageAr: 'لقد انضممت للمجموعة بنجاح',
//     };
//     return data;
//   }
//   await sendRequest(groupId, userId);
//   const data = {
//     message: 'Request sent successfully',
//     messageAr: 'تم إرسال الطلب بنجاح',
//   };
//   return data;
// };

const joinGroup = async (groupId, userId) => {
  const group = await Group.findById(groupId).select('members open blockedUsers');
  if (!group) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Group not found', 'المجموعة غير موجودة');
  }

  // ✅ Check if the user is blocked
  if (group.blockedUsers.some(u => u.toString() === userId.toString())) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'User is blocked from this group',
      'المستخدم محظور من هذه المجموعة'
    );
  }

  const user = await User.findById(userId).select('group');

  // Check if already in a group
  if (user.group) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'User is already in a group',
      'المستخدم موجود بالفعل في مجموعة'
    );
  }

  // Open group → auto join
  if (group.open) {
    const groupd = await groupService.addMemberToGroup(groupId, userId);
    return {
      groupd,
      message: 'You have joined the group successfully',
      messageAr: 'لقد انضممت للمجموعة بنجاح',
    };
  }

  // Closed group → send request
  await sendRequest(groupId, userId);

  return {
    message: 'Request sent successfully',
    messageAr: 'تم إرسال الطلب بنجاح',
  };
};


const inviteUser = async (groupId, userId, groupData, senderId) => {
  const group = await Group.findById(groupId).select('members');
  if (!group) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Group not found', 'المجموعة غير موجودة');
  }
  const user = await User.findById(userId).select('group');
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }
  if (user.group) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User is already in a group', 'المستخدم موجود بالفعل في مجموعة');
  }
  const relation = await GroupRelation.findOne({
    user: userId,
    group: groupId,
    type: 'invite',
    status: 'pending',
    createdAt: { $gt: new Date(new Date() - 3 * 24 * 60 * 60 * 1000) },
  });
  if (relation) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Request already sent', 'تم إرسال الدعوة بالفعل');
  }
  const invite = new GroupRelation({
    user: userId,
    group: groupId,
    type: 'invite',
  });

  const invitation = {
    body: `You have been invited to join ${groupData.name} group.`,
    bodyAr: `لقد تمت دعوتك للانضمام إلى مجموعة ${groupData.name}`,
    invitationType: chatService.INVITATION_TYPES.GROUP,
    invitationId: groupId,
  };

  chatService.sendInvitationMessage({
    senderId,
    receiverId: userId,
    invitation,
  });

  //
  await invite.save();
};

const acceptRequest = async (groupId, userId) => {
  const group = await Group.findById(groupId);
  if (!group) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Group not found', 'المجموعة غير موجودة');
  }
  const user = await User.findById(userId).select('group');
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }
  const relation = await GroupRelation.findOne({
    user: userId,
    group: groupId,
    type: 'request',
    status: 'pending',
  });
  if (!relation) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Request not found', 'الطلب غير موجود');
  }
  relation.status = 'joined';
  await groupService.addMemberToGroup(groupId, userId);
  await sendToUser(
    'userGroupJoin',
    {
      groupId: groupId,
      groupName: group.name,
      userId: userId,
    },
    userId?.toString(),
    false
  );
  await relation.save();
  return {
    message: 'Request joined successfully',
    messageAr: 'تم قبول الطلب بنجاح',
  };
};


const rejectRequest = async (groupId, userId) => {
  const group = await Group.findById(groupId);
  if (!group) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Group not found', 'المجموعة غير موجودة');
  }
  const user = await User.findById(userId).select('group');
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }
  const relation = await GroupRelation.findOne({
    user: userId,
    group: groupId,
    type: 'request',
    status: 'pending',
  });
  if (!relation) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Request not found', 'الطلب غير موجود');
  }
  relation.status = 'rejected';
  await relation.save();

  return {
    message: 'Request rejected successfully',
    messageAr: 'تم رفض الطلب بنجاح',
  };
};

const acceptInvite = async (groupId, userId) => {
  const group = await Group.findById(groupId);
  if (!group) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Group not found', 'المجموعة غير موجودة');
  }
  const user = await User.findById(userId).select('group');
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }
  const relation = await GroupRelation.findOne({
    user: userId,
    group: groupId,
    type: 'invite',
    status: 'pending',
  });
  if (!relation) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Invite not found', 'الدعوة غير موجودة');
  }
  relation.status = 'joined';
  await relation.save();
  // add user to group
  await groupService.addMemberToGroup(groupId, userId);

  return {
    message: 'Invite joined successfully',
    messageAr: 'تم قبول الدعوة بنجاح',
  };
};

const rejectInvite = async (groupId, userId) => {
  const group = await Group.findById(groupId);
  if (!group) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Group not found', 'المجموعة غير موجودة');
  }
  const user = await User.findById(userId).select('group');
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }
  const relation = await GroupRelation.findOne({
    user: userId,
    group: groupId,
    type: 'invite',
    status: 'pending',
  });
  if (!relation) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Invite not found', 'الدعوة غير موجودة');
  }
  relation.status = 'rejected';
  await relation.save();

  return {
    message: 'Invite rejected successfully',
    messageAr: 'تم رفض الدعوة بنجاح',
  };
};

const getPendingRequest = async (groupId, userId) => {
  const relation = await GroupRelation.findOne({
    user: userId,
    group: groupId,
    type: 'request',
    status: 'pending',
  });
  return relation;
};

// get user group relation
const getUserGroupRelation = async (groupId, userId) => {
  // check if user is a member

  const relation = await GroupRelation.findOne({
    user: userId,
    group: groupId,
    type: 'request',
  });
  console.log(relation);
  if (relation) {
    return relation.status;
  }
  return 'none';
};

module.exports = {
  getRequests,
  sendRequest,
  inviteUser,
  acceptRequest,
  rejectRequest,
  acceptInvite,
  rejectInvite,
  joinGroup,
  getPendingRequest,
  getUserGroupRelation,
};
