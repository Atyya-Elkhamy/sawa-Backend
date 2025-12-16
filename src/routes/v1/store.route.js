// routes/store.routes.js

const express = require('express');
const storeController = require('../../controllers/store.controller');
const validate = require('../../middlewares/validate');
const storeValidation = require('../../validations/store.validation');
const auth = require('../../middlewares/auth');
// const upload = require('../../middlewares/upload');

const router = express.Router();

router.get('/sections', auth(), storeController.getStoreSections);
router.get('/sections/:sectionType', validate(storeValidation.getSectionByType), auth(), storeController.getSectionByType);

router.get('/bag', auth(), storeController.getUserBag);
router.post('/buy/:itemId', validate(storeValidation.buyItem), auth(), storeController.buyItem);
router.post('/select/:itemId', auth(), storeController.selectItem);

module.exports = router;
