const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const upload = require('../../middlewares/upload');
const groupValidation = require('../../validations/group.validation');
const groupController = require('../../controllers/group.controller');
const parsePaginationParams = require('../../middlewares/parsePaginationParams');
const groupAdminCheck = require('../../middlewares/group.admin');

const router = express.Router();

router.post(
  '/',
  auth(),
  upload.fields([
    { name: 'cover', maxCount: 1 },
    { name: 'image', maxCount: 1 },
  ]),
  validate(groupValidation.createGroup),
  groupController.createGroup
);
router.get('/check/create', auth(), groupController.checkCreateGroup);
router.get('/check/join/:groupId', auth(), groupController.checkJoinGroup);
router.post('/leave', auth(), groupController.leaveGroup);
router.post('/admin/leave', auth(), groupController.adminLeaveGroup);
router.post('/:groupId/accept-request/:userId', auth(), groupAdminCheck(), groupController.acceptRequest);
router.post('/:groupId/decline-request/:userId', auth(), groupAdminCheck(), groupController.declineRequest);
router.post('/:groupId/accept-invite', auth(), groupController.acceptInvite);
router.post('/:groupId/reject-invite', auth(), groupController.rejectInvite);
router.post('/admin/invite-user', auth(), validate(groupValidation.inviteUser), groupController.inviteUser);

router.get('/:groupId/join', auth(), groupController.joinGroup);
router.get('/:groupId', auth(), validate(groupValidation.getGroup), groupController.getGroup);
// router.post('/:groupId/add-member', auth(), validate(groupValidation.addMember), groupController.addMember);
router.post(
  '/:groupId/remove-member',
  auth(),
  groupAdminCheck(),
  validate(groupValidation.removeMember),
  groupController.removeMember
);
router.post(
  '/:groupId/join-request',
  auth(),
  validate(groupValidation.handleJoinRequest),
  groupController.handleJoinRequest
);
router.post(
  '/:groupId/block-user',
  auth(),
  groupAdminCheck(),
  validate(groupValidation.blockUser),
  groupController.blockUser
);
router.post(
  '/:groupId/unblock-user',
  auth(),
  groupAdminCheck(),
  validate(groupValidation.blockUser),
  groupController.unBlockUser
);
router.get(
  '/:groupId/requests/',
  parsePaginationParams,
  auth(),
  groupAdminCheck(),
  validate(groupValidation.getRequests),
  groupController.getRequests
);
router.get('/:groupId/block-list/', auth(), parsePaginationParams, groupController.getBlockedList);
router.get('/:groupId/members/', auth(), parsePaginationParams, groupController.getMembersList);
router.put(
  '/:groupId/edit/',
  auth(),
  groupAdminCheck(),
  upload.fields([
    { name: 'cover', maxCount: 1 },
    { name: 'image', maxCount: 1 },
  ]),
  validate(groupValidation.editGroup),
  groupController.editGroup
);
router.get('/', auth(), parsePaginationParams, groupController.getGroups);

// seed group by id
router.get('/seed/:groupId', auth(), groupController.seedGroup);

// get group contributions
router.get('/:groupId/contributions/credits', auth(), groupController.getGroupContributionCredits);
router.post(
  '/:groupId/contributions/collect',
  auth(),
  groupAdminCheck(),
  validate(groupValidation.collectContributions),
  groupController.collectContributions
);
router.get(
  '/:groupId/contributions/daily',
  parsePaginationParams,
  auth(),
  groupAdminCheck(),
  groupController.dailyContributions
);

router.get(
  '/:groupId/contributions/monthly',
  parsePaginationParams,
  auth(),
  groupAdminCheck(),
  groupController.monthlyContributions
);

module.exports = router;
