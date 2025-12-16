const express = require('express');
const storeController = require('../../../controllers/store.controller');
const giftController = require('../../../controllers/gift.controller');
const storeValidation = require('../../../validations/store.validation');
const upload = require('../../../middlewares/upload');
const validate = require('../../../middlewares/validate');

const router = express.Router();

router.post(
  '/create-item',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'file', maxCount: 1 },
  ]),
  validate(storeValidation.createItem),

  storeController.createItem
);

// edit item
router.put(
  '/edit-item/:itemId',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'file', maxCount: 1 },
  ]),
  validate(storeValidation.editItem),
  storeController.editItem
);

// delete item

router.get('/toggle-item-visibility/:itemId', storeController.toggleItemVisibility);

// router.post(
//   '/create-item/:sectionId/item',
//   upload.fields([
//     { name: 'image', maxCount: 1 },
//     { name: 'file', maxCount: 1 },
//   ]),
//   validate(storeValidation.createItem),
//   storeController.createItem
// );

router.post(
  '/gift/create',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'file', maxCount: 1 },
  ]),
  validate(storeValidation.createGift),
  giftController.createGift
);

// edit gift
router.post(
  '/gift/edit/:giftId',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'file', maxCount: 1 },
  ]),
  validate(storeValidation.editGift),
  giftController.editGift
);

module.exports = router;
