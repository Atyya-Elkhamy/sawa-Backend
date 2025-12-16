const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const userValidation = require('../../validations/user.validation');
const userController = require('../../controllers/user.controller');
const parsePaginationParams = require('../../middlewares/parsePaginationParams');

const router = express.Router();

router.get('/search/:query', auth(), parsePaginationParams, userController.searchUsers);
router.get('/main/followers', auth(), parsePaginationParams, userController.getFollowersList);
router.get('/main/following', auth(), parsePaginationParams, userController.getFollowingList);
router.get('/main/friends', auth(), parsePaginationParams, userController.getFriendsList);

router.get('/main/ignored', auth(), parsePaginationParams, userController.getIgnoredList);
router.get('/main/blocked', auth(), parsePaginationParams, userController.getBlockedList);
router.post('/follow/:id', auth(), userController.followUser);
router.post('/ignore/:id', auth(), userController.ignoreUser);
router.post('/accept-follow/:id', auth(), userController.acceptUser);
router.post('/block/:id', auth(), userController.blockUser);

router.get('/main/recent-followers', parsePaginationParams, auth(), userController.getRecentFollowersList);
router.get('/main/recent-friends-added', parsePaginationParams, auth(), userController.getRecentFriendsAdded);
router.get('/main/recent-friends-removed', parsePaginationParams, auth(), userController.getRecentFriendsRemoved);

// router.get('/vip/:userId', auth(), userController.getVipLevel);
// router.get('/pro/:userId', auth(), userController.getProExpiration);
// router.get('/store/:userId', auth(), userController.getStoreSections);

// router.route('/main/:id').get(auth(), userController.getMainProfile);

// router.route('/:id/vip').get(auth(), userController.getVipLevel);

// router.route('/:id/pro').get(auth(), userController.getProExpiration);

// router.route('/:id/store').get(auth(), userController.getStoreSections);

// router.route('/:id/level').get(auth(), userController.getUserLevel);

// router.route('/:id/credits').get(auth(), userController.getCreditsHistory);

// router.route('/:id/credits_agency').get(auth(), userController.getCreditsAgency);

// router.route('/:id/host_agency/host/:day').get(auth(), userController.getHostAgencyData);

// router.route('/:id/host_agency/join_requests').get(auth(), userController.getJoinRequests);

module.exports = router;
