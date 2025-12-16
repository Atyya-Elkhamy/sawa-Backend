// routes/profile.routes.js

const express = require('express');
const { profileController, creditAgencyController, storeController, authController } = require('../../controllers');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { profileValidation, agencyValidation, storeValidation } = require('../../validations');
const upload = require('../../middlewares/upload');
const parsePaginationParams = require('../../middlewares/parsePaginationParams');
const { getProPricing, getVipPricing } = require('../../config/pricing');
const accumulatedChargedValidation = require('../../validations/accumulatedCharged.validation');
const accumulatedChargedController = require('../../controllers/accumulatedCharged.controller');

const router = express.Router();

// Main profile routes
router.get('/me', auth(), profileController.getUserProfile);
// Public profile routes
router.get('/public/:userId', validate(profileValidation.getPublicProfile), auth(), profileController.getPublicProfile);
// mini profile
router.get('/mini/:userId', validate(profileValidation.getPublicProfile), auth(), profileController.getMiniProfile);
router.get('/public/giftWall/:userId', validate(profileValidation.getPublicProfile), auth(), profileController.getGiftWall);
// Friends and social routes
router.get('/public/badgeWall/:userId', auth(), profileController.getBadgeWall);
router.get('/level', auth(), profileController.getUserLevel); // Get user level data
// VIP level and subscription routes
router.get('/vip', auth(), profileController.getVipLevel); // Get VIP level of a user
router.get('/pro', auth(), profileController.getPro); // Get Pro expiration date
// //charge level an accumalated analytics

router.get('/charge-level', auth(), profileController.getChargeLevel); // Get charge level of a user

router.get(
  '/charge-level/accumulation-periodic/',
  auth(),
  validate(accumulatedChargedValidation.getAccumulationBerPeriod),
  accumulatedChargedController.getAccumulationBerPeriod
);

router.get(
  '/charge-level/top-three',
  auth(),
  validate(accumulatedChargedValidation.getTopThree),
  accumulatedChargedController.getTopThree
);

router.post(
  '/charge-level/collect-prize/:prizeId',
  auth(),
  validate(accumulatedChargedValidation.collectPrize),
  accumulatedChargedController.collectPrize
);

// Store and inventory routes

router.get('/wallet', auth(), profileController.getCredits); // Get user wallet
router.get('/wallet/history', auth(), parsePaginationParams, profileController.getCreditsHistory); // Get user wallet history
// credit agency routes
router.get('/credit_agency', auth(), creditAgencyController.getCreditBalance); // Get credit balance for a user
router.get(
  '/credit_agency/history',
  validate(agencyValidation.getCreditAgencyHistory),
  auth(),
  parsePaginationParams,
  creditAgencyController.getCreditTransactionHistory
); // Get credit transaction history for a user
router.post(
  '/credit_agency/transfers',
  validate(agencyValidation.transferCreditsFromCreditAgency),
  auth(),
  creditAgencyController.transferCredits
);

router.get('/settings', auth(), profileController.getProfileSettings); // Get profile settings
router.put('/settings', validate(profileValidation.updateProfileSettings), auth(), profileController.updateProfileSettings); // Update profile settings
router.post(
  '/settings/delete',
  auth(), // Ensure the user is authenticated
  validate(profileValidation.deleteUser), // Validate the password is provided
  authController.deleteUser
);
router.get('/contacts', auth(), profileController.getContacts); // Get user contacts

// edit profile
router.put('/edit/about', auth(), validate(profileValidation.aboutValidation), profileController.updateAbout);

// Update album images
router.post(
  '/edit/album/add',
  auth(),
  upload.array('images', 6),
  // validate(profileValidation.addAlbumValidation),
  profileController.addImageToAlbum
);

// Delete image from album
router.delete(
  '/edit/album/delete',
  auth(),
  validate(profileValidation.deleteAlbumImageValidation),
  profileController.deleteImageFromAlbum
);

// Sort album images
router.put('/edit/album/sort', auth(), validate(profileValidation.sortAlbumValidation), profileController.sortAlbum);
// Update interests
router.put('/edit/interests', auth(), profileController.updateInterests);

router.put(
  '/edit/profile',
  auth(),
  upload.single('avatar'),
  validate(profileValidation.profileValidation),
  profileController.editProfile
);
router.post('/vip/subscribe', auth(), validate(storeValidation.subscribeVip), profileController.subscribeVip); // Subscribe to VIP
router.post('/pro/subscribe', auth(), validate(storeValidation.subscribePro), profileController.subscribePro); // Subscribe to Pro
router.post(
  '/vip/transfer-credits-to-user',
  auth(),
  validate(storeValidation.vipTransferCredits),
  profileController.vipTransferCredits
); // Transfer credits to another user
router.post('/transfer-credits-to-user', auth(), validate(storeValidation.TransferCredits), profileController.transferCash); // Transfer credits to another user
router.get('/profile-visits', auth(), parsePaginationParams, profileController.getProfileVisitors);
router.get('/relations/:targetUserId', auth(), profileController.getRelations);

// Upload avatar

// Transfer credits between users
// router.get('/:id/storeSections', profileController.getStoreSections); // Get store sections for the user
// router.get('/:id/level', profileController.getUserLevel); // Get user level data
// router.get('/:id/creditsHistory', profileController.getCreditsHistory); // Get credits history
// router.get('/:id/creditsAgency', profileController.getCreditsAgency); // Get credits agency data
// router.get('/:id/hostAgencyData', profileController.getHostAgencyData); // Get host agency data

// Endpoint to get pro pricing
router.get('/pro/pricing', async (req, res) => {
  try {
    const pricingConfig = await getProPricing();
    res.json(pricingConfig);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pro pricing' });
  }
});

// Endpoint to get VIP pricing
router.get('/vip/pricing', async (req, res) => {
  try {
    const vipPricingConfig = await getVipPricing();
    res.json(vipPricingConfig);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch VIP pricing' });
  }
});
// Join requests and agency management
router.get('/:id/joinRequests', profileController.getJoinRequests); // Get join requests

module.exports = router;

// router.put('/edit/avatar', auth(), upload.single('avatar'), profileController.uploadAvatar);
