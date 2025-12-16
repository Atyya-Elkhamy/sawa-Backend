const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { groupService, roomService } = require('../services');
const userService = require('../services/user.service');
const groupRelationService = require('../services/group/group.relations.service');
const User = require('../models/user.model');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');
const { Group } = require('../models');
const groupContributionService = require('../services/group/groupContribution.service');
/**
 * Create a new group
 */
const createGroup = catchAsync(async (req, res) => {
  const adminId = req.user.id;
  const admin = await User.findById(adminId).select('group credits friendsCount');
  const existingGroup = await Group.findOne({ admin: adminId });
  const minimumFriends = 0;

  // check also if the user is already in a group
  if (admin.group) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User already has a group', 'المستخدم لديه مجموعة بالفعل');
  }
  // check if the user is already in a group
  const existingUserGroup = await User.findById(adminId).select('group');
  // check if the user is already in a group
  if (existingUserGroup && existingUserGroup.group) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User already has a group', 'المستخدم لديه مجموعة بالفعل');
  }

  if (existingGroup) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User already has a group', 'المستخدم لديه مجموعة بالفعل');
  }
  if (admin.credits < 20000) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient credits you should have  20000 credits', 'الرصيد غير كافي يجب أن يكون لديك 20000 رصيد على الأقل');
  }
  if (admin.friendsCount < minimumFriends) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `You need at least ${minimumFriends} friends to create a group`,
      `يجب أن يكون لديك على الأقل ${minimumFriends} أصدقاء لإنشاء مجموعة`
    );
  }
  logger.info('Creating a new group');
  logger.info(admin);
  const { name, open } = req.body;
  console.log('Creating group', name, open);
  const requestBody = {
    name,
    open,
    cover: '',
    image: '',
  };
  if (req.files) {
    const { cover, image } = req.files;
    if (cover) {
      requestBody.cover = cover[0].location;
    }
    if (image) {
      requestBody.image = image[0].location;
    }
  }
  const group = await groupService.createGroup({ ...requestBody, admin: req.user.id }, admin);
  // fetch the group with populated members
  const populatedGroup = await groupService.getGroup(group._id);
  res.status(httpStatus.CREATED).send(populatedGroup);
});

const checkCreateGroup = catchAsync(async (req, res) => {
  const adminId = req.user.id;
  const admin = await User.findById(adminId).select('credits friendsCount');

  const group = await Group.findOne({ admin: adminId });

  res.status(httpStatus.OK).send({
    credits: admin.credits,
    friendsCount: admin.friendsCount,
    hasGroup: !!group,
  });
});

const checkJoinGroup = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { groupId } = req.params;
  let isOpen = false;
  let isMember = false;
  let isBlocked = false;
  let canJoin = false;
  let inGroup = false;
  let requestSent = false;
  let canRequest = false;
  const user = await User.findById(userId).select('group');
  if (user.group) {
    inGroup = true;
  }

  const group = await Group.findById(groupId).select('open blockedUsers');
  if (!group) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Group not found', 'المجموعة غير موجودة');
  }

  const request = await groupRelationService.getPendingRequest(groupId, userId);

  if (request) {
    requestSent = true;
  }

  isOpen = !!group.open;
  // Check if user is a member by looking at their group field
  const userWithGroup = await User.findById(userId).select('group');
  isMember = userWithGroup.group && userWithGroup.group.toString() === groupId;
  isBlocked = group.blockedUsers.includes(userId);
  if (!isMember && !isBlocked && isOpen && !inGroup) {
    canJoin = true;
  }
  if (!isMember && !isBlocked && !isOpen && !inGroup && !requestSent) {
    canRequest = true;
  }

  const data = {
    requestSent,
    isOpen,
    isMember,
    isBlocked,
    canJoin,
    canRequest,
    inGroup,
  };

  res.status(httpStatus.OK).send(data);
});

const getGroups = catchAsync(async (req, res) => {
  const groups = await groupService.getGroups(req.query);
  res.status(httpStatus.OK).send(groups);
});

const editGroup = catchAsync(async (req, res) => {
  const { groupId } = req.params;
  const { name, open } = req.body;
  console.log('Editing group', groupId, name, open);
  const requestBody = {};
  if (name) requestBody.name = name;
  if (open !== undefined) requestBody.open = open;
  if (req.files) {
    const { cover, image } = req.files;
    if (cover) requestBody.cover = cover[0].location;
    if (image) requestBody.image = image[0].location;
  }
  const group = await groupService.editGroup(groupId, requestBody);

  res.status(httpStatus.OK).send(group);
});
/**
 * Get a group by ID
 */
const getGroup = catchAsync(async (req, res) => {
  const group = await groupService.getGroup(req.params.groupId);
  const userId = req.user.id;
  if (!group) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Group not found', 'المجموعة غير موجودة');
  }
  console.log('Getting group', group);

  // Check if the user is a member of the group
  const userWithGroup = await User.findById(userId).select('group');
  const isMember = userWithGroup.group && userWithGroup.group.toString() === req.params.groupId;

  // Get all users in this group to find their rooms
  const groupMembers = await User.find({ group: req.params.groupId }).select('_id');
  const membersIds = groupMembers.map((member) => member._id.toString());
  // add admin to the members array
  if (group.admin?._id) {
    membersIds.push(group.admin._id?.toString());
  }

  // get group rooms
  const groupRooms = await roomService.getRoomsByOwnerIds(membersIds);
  // Determine the user's relationship with the group
  let requestState = '';
  console.log('isMember', isMember);
  if (isMember) {
    requestState = 'joined';
  } else {
    const userGroupRelation = await groupRelationService.getUserGroupRelation(req.params.groupId, userId);
    if (userGroupRelation) {
      requestState = userGroupRelation;
    }
  }
  const groupObject = group;

  res.status(httpStatus.OK).send({
    ...groupObject,
    groupRooms,
    requestState,
  });
});

/**
 * Add a member to the group
 */
const addMember = catchAsync(async (req, res) => {
  const group = await groupService.addMemberToGroup(req.params.groupId, req.body.userId);
  res.status(httpStatus.OK).send(group);
});

/**
 * Remove a member from the group (admin only)
 */
const removeMember = catchAsync(async (req, res) => {
  const group = await groupService.removeMemberFromGroup(req.params.groupId, req.body.userId);
  res.status(httpStatus.OK).send({
    message: 'Member removed successfully',
    messageAr: 'تمت إزالة العضو بنجاح',
  });
});

const leaveGroup = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const user = await User.findById(userId).select('group');
  if (!user?.group) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User is not in a group', 'المستخدم ليس في مجموعة');
  }
  logger.info('Leaving group');
  logger.info(user);
  logger.info(user.group);
  await groupService.removeMemberFromGroup(user.group, userId);
  res.status(httpStatus.OK).send({
    message: 'You have left the group',
    messageAr: 'لقد غادرت المجموعة',
  });
});

const adminLeaveGroup = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const user = await User.findById(userId).select('group');
  if (!user?.group) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User is not in a group', 'المستخدم ليس في مجموعة');
  }
  // check if the user is an admin
  await groupService.checkAdminPrivileges(user.group, userId);

  const group = await groupService.adminLeaveGroup(user.group, userId);
  res.status(httpStatus.OK).send({ message: 'group has been deleted', messageAr: 'تم حذف المجموعة' });
});
/**
 * Handle join request (accept or decline) - admin only
 */
const handleJoinRequest = catchAsync(async (req, res) => {
  const group = await groupService.handleJoinRequest(req.params.groupId, req.body.userId, req.body.action, req.user.id);
  res.status(httpStatus.OK).send(group);
});

const inviteUser = catchAsync(async (req, res) => {
  const { userId, groupId } = req.body;
  const adminId = req.user.id;
  // check if is friend
  await userService.isFriend(adminId, userId);
  const groupData = await groupService.checkAdminPrivileges(groupId, adminId);
  const group = await groupRelationService.inviteUser(groupId, userId, groupData, adminId);
  res.status(httpStatus.OK).send({
    message: 'Invite sent successfully',
    messageAr: 'تم إرسال الدعوة بنجاح',
  });
});

/**
 * Block a user from the group (admin only)
 */
const blockUser = catchAsync(async (req, res) => {
  const { userId } = req.body;
  // user id cannot be the same as the group admin id
  if (userId == req.user.id) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'You cannot block yourself', 'لا يمكنك حظر نفسك');
  }
  const group = await groupService.blockUserFromGroup(req.params.groupId, userId);
  // send notification to the user

  res.status(httpStatus.OK).send(group);
});
const unBlockUser = catchAsync(async (req, res) => {
  const group = await groupService.unBlockUser(req.params.groupId, req.body.userId);
  res.status(httpStatus.OK).send(group);
});
const getRequests = catchAsync(async (req, res) => {
  const { groupId } = req.params;
  const { page, limit } = req.query;
  const requests = await groupRelationService.getRequests(groupId, Number(page), Number(limit));
  res.status(httpStatus.OK).send(requests);
});

const joinGroup = catchAsync(async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;
  console.log('Joining group', groupId, userId);
  const user = await User.findById(userId).select('group');
  if (user.group) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User is already in a group', 'المستخدم موجود بالفعل في مجموعة');
  }
  const data = await groupRelationService.joinGroup(groupId, userId);
  res.status(httpStatus.OK).send({ data });
});

const acceptRequest = catchAsync(async (req, res) => {
  const { groupId, userId } = req.params;
  const adminId = req.user.id;
  const group = await groupRelationService.acceptRequest(groupId, userId, adminId);
  res.status(httpStatus.OK).send(group);
});

const declineRequest = catchAsync(async (req, res) => {
  const { groupId, userId } = req.params;
  const group = await groupRelationService.rejectRequest(groupId, userId);
  res.status(httpStatus.OK).send(group);
});

const acceptInvite = catchAsync(async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;
  const group = await groupRelationService.acceptInvite(groupId, userId);
  res.status(httpStatus.OK).send(group);
});

const rejectInvite = catchAsync(async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;
  const group = await groupRelationService.rejectInvite(groupId, userId);
  res.status(httpStatus.OK).send(group);
});

const getBlockedList = catchAsync(async (req, res) => {
  const { groupId } = req.params;
  const { page, limit } = req.query;
  const blockedUsers = await groupService.getBlockedList(groupId, Number(page), Number(limit));
  res.status(httpStatus.OK).send(blockedUsers);
});
const getMembersList = catchAsync(async (req, res) => {
  const { groupId } = req.params;
  const { page, limit } = req.query;
  const userId = req.user.id;
  const isAdmin = await groupService.checkAdminPrivileges(groupId, userId, true);
  const members = await groupService.getMembersList(groupId, Number(page), Number(limit));
  res.status(httpStatus.OK).send({
    ...members,
    isAdmin: !!isAdmin,
  });
});
// select 15 random users and add to block and members array
const seedGroup = catchAsync(async (req, res) => {
  const { groupId } = req.params;
  const group = await Group.findById(groupId).select('blockedUsers');
  const users = await User.aggregate([{ $sample: { size: 15 } }]);
  const userIds = users.map((user) => user._id);

  // Add users to the group by updating their group field
  await User.updateMany(
    { _id: { $in: userIds } },
    { $set: { group: groupId } }
  );

  group.blockedUsers = [...group.blockedUsers, ...userIds];
  await group.save();

  // Update the group's member count
  await group.updateMembersCount();

  res.status(httpStatus.OK).send(group);
});

/**
 * Collect contributions for a group (admin only)
 */
const collectContributions = catchAsync(async (req, res) => {
  const { groupId } = req.params;
  const { group, amount } = await groupContributionService.CollectContributions(groupId);
  res.status(httpStatus.OK).send({
    message: 'Contributions collected successfully',
    messageAr: 'تم جمع المساهمات بنجاح',
    group,
    amount,
  });
});

/**
 * daily contributions for a group (admin only)
 *
 */
const dailyContributions = catchAsync(async (req, res) => {
  const { groupId } = req.params;
  const { page, limit } = req.query || { page: 1, limit: 10 };
  const day = req.query.day || new Date().getDate();
  const group = await groupContributionService.getDailyContributions(
    groupId,
    Number(day || new Date().getDate()),
    Number(page || 1),
    Number(limit || 10)
  );
  res.status(httpStatus.OK).send(group);
});

/**
 * monthly contributions for a group (admin only)
 */
const monthlyContributions = catchAsync(async (req, res) => {
  const { groupId } = req.params;
  const { page, limit } = req.query || { page: 1, limit: 10 };
  const group = await groupContributionService.getMonthlyContributions(groupId, Number(page || 1), Number(limit || 10));
  console.log('group', group);
  res.status(httpStatus.OK).send(group);
});

/**
 * get group contributions
 */
const getGroupContributionCredits = catchAsync(async (req, res) => {
  const { groupId } = req.params;
  const group = await Group.findById(groupId).select('contributionCredits');
  res.status(httpStatus.OK).send(group);
});

module.exports = {
  createGroup,
  getGroup,
  addMember,
  removeMember,
  handleJoinRequest,
  blockUser,
  getRequests,
  editGroup,
  joinGroup,
  getGroups,
  checkCreateGroup,
  checkJoinGroup,
  acceptRequest,
  declineRequest,
  acceptInvite,
  rejectInvite,
  leaveGroup,
  adminLeaveGroup,
  inviteUser,
  unBlockUser,
  getBlockedList,
  seedGroup,
  getMembersList,
  collectContributions,
  dailyContributions,
  monthlyContributions,
  getGroupContributionCredits,
};
