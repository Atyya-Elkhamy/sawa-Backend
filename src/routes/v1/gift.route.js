const express = require('express');
const upload = require('../../middlewares/upload');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const giftController = require('../../controllers/gift.controller');
const { storeValidation } = require('../../validations');
const parsePaginationParams = require('../../middlewares/parsePaginationParams');

const router = express.Router();

// Route to create a new gift

router.post('/send', validate(storeValidation.sendGift), auth(), giftController.sendGift);
router.get('/history', auth(), parsePaginationParams, giftController.getGiftTransactionHistory);
// Route to get all available gifts
router.get('/', auth(), giftController.getGifts);

module.exports = router;
