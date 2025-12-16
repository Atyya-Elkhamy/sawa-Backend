const httpStatus = require('http-status');
const Group = require('../../models/group.model');
const User = require('../../models/user.model');
const ApiError = require('../../utils/ApiError');
const { generateUniqueUserId } = require('../../utils/IDGen');
const { userProjection } = require('../user.service');
const logger = require('../../config/logger');
const userService = require('../user.service');
const messageSender = require('../chat/messageSender');
const GroupRelation = require('../../models/invites-requests/group.relation.model');

const GroupSearchProjection = 'name image cover membersCount groupId';
/**
 * Check if the requesting user is the group admin
 * @param {ObjectId} groupId - ID of the group
 * @param {ObjectId} userId - ID of the user making the request
 * @param skipError
 * @returns {Promise<void>}
 */
// 633.20 40

const checkAdminPrivileges = async (groupId, userId, skipError = false) => {
  const group = await Group.findById(groupId).select('admin name');
  let isAdmin = true;
  if (!group) {
    isAdmin = false;
    if (!skipError) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Group not found', 'المجموعة غير موجودة');
    }
  }

  if (group.admin.toString() !== userId.toString()) {
    isAdmin = false;
    if (!skipError) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'You do not have admin privileges for this group',
        'ليس لديك صلاحيات المسؤول لهذه المجموعة'
      );
    }
  }
  return isAdmin;
};

const getGroups = async (params) => {
  const page = parseInt(params.page, 10) || 1;
  const limit = parseInt(params.limit, 10) || 10;
  const skip = (page - 1) * limit;
  const searchTerm = params.searchTerm || '';
  if (searchTerm) {
    const groups = await Group.find({
      // name or groupId
      $or: [{ name: { $regex: searchTerm, $options: 'i' } }, { groupId: searchTerm }],
    })
      .limit(limit)
      .sort({
        // Stable sort: primary by membersCount desc, tie-break by _id desc to keep deterministic order
        membersCount: -1,
        _id: -1,
      })
      .skip(skip)
      .select(GroupSearchProjection);
    const total = await Group.countDocuments({
      $or: [{ name: { $regex: searchTerm, $options: 'i' } }, { groupId: searchTerm }],
    });
    const totalPages = Math.ceil(total / limit);
    return {
      list: groups,
      total,
      page,
      limit,
      nextPage: totalPages > page ? page + 1 : null,
      totalPages,
    };
  }
  const groups = await Group.find()
    .limit(limit)
    .sort({
      // Stable sort: primary by membersCount desc, tie-break by _id desc to keep deterministic order
      membersCount: -1,
      _id: -1,
    })
    .skip(skip)
    .select(GroupSearchProjection);

  const total = await Group.countDocuments();
  const totalPages = Math.ceil(total / limit);
  return {
    list: groups,
    total,
    page,
    limit,
    nextPage: page + 1 <= totalPages ? page + 1 : null,
    totalPages,
  };
};

/**
 * Create a new group
 * @param groupBody
 * @param admin
 */

const createGroup = async (groupBody, admin) => {
  // check if group name is unique
  const groupExists = await Group.findOne({
    name: groupBody.name,
  })
    .select('name')
    .lean();

  if (groupExists) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Group name already exists', 'اسم المجموعة موجود بالفعل');
  }
  const groupId = await generateUniqueUserId();

  const group = new Group({ ...groupBody, groupId });
  await group.save();

  const user = admin;
  await userService.deductUserBalance(user._id, 20000, 'group creation', 'إنشاء مجموعة');
  user.group = group._id;
  await user.save();

  // Update the group's member count
  await group.updateMembersCount();

  return group;
};

/**
 * Get group by ID
 * @param groupId
 */
const getGroupById = async (groupId) => {
  const group = await Group.findById(groupId);
  if (!group) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Group not found', 'المجموعة غير موجودة');
  }
  return group;
};

/**
 * Add a member to the group
 * @param groupId
 * @param userId
 */
const addMemberToGroup = async (groupId, userId) => {
  const group = await getGroupById(groupId);
  const user = await User.findById(userId).select('group');

  // Check current member count by counting users with this group
  const currentMemberCount = await User.countDocuments({ group: groupId });
  if (!group || currentMemberCount >= 200) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Group has reached the maximum number of members',
      'المجموعة قد وصلت إلى الحد الأقصى لعدد الأعضاء'
    );
  }
  if (!user || user.group) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'User not found or already in a group',
      'المستخدم غير موجود أو بالفعل في مجموعة'
    );
  }

  if (group.blockedUsers.includes(userId.toString())) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'User is blocked and cannot join the group',
      'المستخدم محظور ولا يمكنه الانضمام إلى المجموعة'
    );
  }

  user.group = groupId;
  await user.save();

  // Update the group's member count
  await group.updateMembersCount();

  return group;
};

/**
 * Remove a member from the group (admin only)
 * @param groupId
 * @param userId
 */
// const removeMemberFromGroup = async (groupId, userId) => {
//   const group = await Group.findById(groupId).select('admin');
//   logger.info('group', group);
//   logger.info('userId', userId);
//   logger.info('group.admin', group.admin);
//   if (group.admin.toString() === userId.toString()) {
//     throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot remove the admin from the group', 'لا يمكن إزالة المشرف من المجموعة');
//   }

//   const user = await User.findById(userId).select('group');

//   if (!user) {
//     throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
//   }

//   user.group = null;
//   await user.save();

//   // Update the group's member count
//   const groupToUpdate = await Group.findById(groupId);
//   if (groupToUpdate) {
//     await groupToUpdate.updateMembersCount();
//   }

//   await messageSender.sendToUser(
//     'userDeletedFromGroup',
//     {
//       groupId,
//       userId: userId?.toString(),
//       message: 'You have been blocked from the group',
//       messageAr: 'لقد تم حظرك من المجموعة',
//     },
//     userId?.toString(),
//     false
//   );

//   return group;
// };

const removeMemberFromGroup = async (groupId, userId) => {
  const group = await Group.findById(groupId).select('admin');
  logger.info('group', group);
  logger.info('userId', userId);

  if (group.admin.toString() === userId.toString()) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Cannot remove the admin from the group',
      'لا يمكن إزالة المشرف من المجموعة'
    );
  }

  const user = await User.findById(userId).select('group');
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }

  // Remove the user from the group
  user.group = null;
  await user.save();

  // ❗ DELETE group relation for that user in this group
  await GroupRelation.deleteMany({ group: groupId, user: userId });

  // Update group's member count
  const groupToUpdate = await Group.findById(groupId);
  if (groupToUpdate) {
    await groupToUpdate.updateMembersCount();
  }

  // Notify the user
  await messageSender.sendToUser(
    'userDeletedFromGroup',
    {
      groupId,
      userId: userId?.toString(),
      message: 'You have been removed from the group',
      messageAr: 'لقد تم حذفك من المجموعة',
    },
    userId?.toString(),
    false
  );

  return group;
};


// when admin leaves the group delete the group
const adminLeaveGroup = async (groupId, userId) => {
  const group = await Group.findById(groupId).select('admin');
  if (group.admin.toString() === userId.toString()) {
    // Capture members before deletion to notify them
    const members = await User.find({ group: groupId }).select('_id').lean();

    await User.updateMany(
      {
        group: groupId,
      },
      { $set: { group: null } }
    );
    await Group.findByIdAndDelete(groupId);

    // Notify all previous members that the group has been deleted
    if (members?.length) {
      await Promise.all(
        members.map((m) =>
          messageSender.sendToUser(
            'groupDeleted',
            {
              groupId: groupId.toString(),
              message: 'Group has been deleted by the admin',
              messageAr: 'تم حذف المجموعة بواسطة المشرف',
            },
            m._id.toString(),
            false
          )
        )
      );
    }
    return {
      message: 'Group deleted successfully',
      messageAr: 'تم حذف المجموعة بنجاح',
    };
  }
  // set group on users to null
  throw new ApiError(httpStatus.BAD_REQUEST, 'Only the admin can delete the group', 'يمكن للمشرف فقط حذف المجموعة');
};

/**
 * Handle join request (accept or decline) - admin only
 * @param groupId
 * @param userId
 * @param action
 * @param adminId
 */
const handleJoinRequest = async (groupId, userId, action, adminId) => {
  await checkAdminPrivileges(groupId, adminId);

  const group = await getGroupById(groupId);
  const user = await User.findById(userId).select('group');

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }

  const requestIndex = group.joinRequests.findIndex((request) => request.user.toString() === userId.toString());

  if (requestIndex === -1) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Join request not found', 'طلب الانضمام غير موجود');
  }

  const request = group.joinRequests[requestIndex];

  if (action === 'accept') {
    request.status = 'joined';
    user.group = group._id;
  } else if (action === 'decline') {
    request.status = 'rejected';
  }

  await group.save();
  await user.save();

  return group;
};

/**
 * Block a user from the group (admin only)
 * @param groupId
 * @param userId
 */
const blockUserFromGroup = async (groupId, userId) => {
  const group = await Group.findById(groupId).select('blockedUsers');
  if (!group) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Group not found', 'المجموعة غير موجودة');
  }
  const user = await User.findById(userId).select('group');
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }
  // Add the user to the blockedUsers list
  if (!group.blockedUsers.includes(userId)) {
    group.blockedUsers.push(userId);
  } else {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User is already blocked', 'المستخدم محظور بالفعل');
  }
  await group.save();
  // Set the user's group to null
  if (user.group && user.group?.toString() === groupId.toString()) {
    user.group = null;
    await user.save();
    // await GroupRelation.deleteMany({ group: groupId, user: userId });
    await GroupRelation.updateMany(
      { group: groupId, user: userId },
      { $set: { status: 'blocked' } }
    );
    // Update the group's member count
    await group.updateMembersCount();

    await messageSender.sendToUser(
      'blockFromGroup',
      {
        groupId,
        userId: userId.toString(),
        message: 'You have been blocked from the group',
        messageAr: 'لقد تم حظرك من المجموعة',
      },
      userId.toString(),
      false
    );
  }
  return group;
};

const unBlockUser = async (groupId, userId) => {
  const group = await Group.findById(groupId).select('blockedUsers');

  group.blockedUsers = group.blockedUsers.filter((blockedUser) => blockedUser.toString() !== userId.toString());
  logger.info('group.blockedUsers', group.blockedUsers);
  await group.save();
  await GroupRelation.deleteMany({ group: groupId, user: userId });
  logger.info('group.blockedUsers', group.blockedUsers);
  return group;
};

const editGroup = async (groupId, requestBody) => {
  const group = await Group.findByIdAndUpdate(groupId, { $set: requestBody }, { new: true })
    .select('-balance -blockedUsers')
    .populate('admin', userProjection);

  // Transform group to handle deleted admin
  const transformedGroup = userService.transformDeletedUsers(group, 'admin');
  return transformedGroup;
};

const getGroup = async (groupId) => {
  // populate admin
  const group = await Group.findById(groupId)
    .select('-balance -blockedUsers')
    .populate([
      {
        path: 'admin',
        select: userProjection,
      },
    ]);

  if (!group) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Group not found', 'المجموعة غير موجودة');
  }

  // Transform group to handle deleted admin
  const transformedGroup = userService.transformDeletedUsers(group, 'admin');
  return transformedGroup;
};
const getBlockedList = async (groupId, page = 1, limit = 10) => {
  // Validate page and limit
  page = Math.max(1, page);
  limit = Math.max(1, limit);

  // Find the group and get the total count of blocked users
  const group = await Group.findById(groupId).select('blockedUsers');
  if (!group) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Group not found', 'المجموعة غير موجودة');
  }

  const total = group.blockedUsers.length;
  const totalPages = Math.ceil(total / limit);

  // Paginate blocked users
  const blockedUsers = await Group.findById(groupId)
    .select('blockedUsers')
    .populate({
      path: 'blockedUsers',
      select: userProjection,
      options: {
        limit,
        skip: (page - 1) * limit,
      },
    });

  return {
    list: blockedUsers.blockedUsers,
    total,
    page,
    limit,
    nextPage: totalPages > page ? page + 1 : null,
    totalPages,
  };
};

const getMembersList = async (groupId, page = 1, limit = 10) => {
  // Validate page and limit
  page = Math.max(1, page);
  limit = Math.max(1, limit);

  // Get group to verify it exists
  const group = await Group.findById(groupId).select('admin');
  if (!group) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Group not found', 'المجموعة غير موجودة');
  }

  // Count total members (exclude admin)
  const total = await User.countDocuments({
    group: groupId,
    _id: { $ne: group.admin }
  });
  const totalPages = Math.ceil(total / limit);

  // Get paginated members (exclude admin)
  const members = await User.find({
    group: groupId,
    _id: { $ne: group.admin }
  })
    .select(userProjection)
    .limit(limit)
    .skip((page - 1) * limit);

  return {
    list: members,
    total,
    page,
    limit,
    nextPage: totalPages > page ? page + 1 : null,
    totalPages,
  };
};



module.exports = {
  createGroup,
  getGroupById,
  addMemberToGroup,
  removeMemberFromGroup,
  handleJoinRequest,
  blockUserFromGroup,
  checkAdminPrivileges,
  editGroup,
  getGroups,
  adminLeaveGroup,
  getGroup,
  getBlockedList,
  unBlockUser,
  getMembersList,
};
