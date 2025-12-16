// controllers/store.controller.js

const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { storeService } = require('../services');

/**
 * Get all sections in the store
 */
const getStoreSections = catchAsync(async (req, res) => {
  const sections = await storeService.getStoreSections();
  res.send({ sections });
});

/**
 * Get items by section type
 */
const getSectionByType = catchAsync(async (req, res) => {
  if (!req.params.sectionType) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Section type is required', 'نوع القسم مطلوب');
  }
  const items = await storeService.getSectionByType(req.params.sectionType);
  res.send({ items });
});

/**
 * Create a new item
 */
const createItem = catchAsync(async (req, res) => {
  const itemBody = req.body;
  if (req.files) {
    if (req.files.image) {
      itemBody.image = req.files.image[0].location;
    }
    if (req.files.file) {
      itemBody.file = req.files.file[0].location;
    }
  }
  const item = await storeService.addItem(itemBody);
  res.status(httpStatus.CREATED).send(item);
});

/**
 * Get user's bag
 */
const getUserBag = catchAsync(async (req, res) => {
  console.log('User ID:', req.user.id);
  const bag = await storeService.getMyBoughtItems(req.user.id);
  res.send({ bag });
});

/**
 * Buy an item
 */
// controllers/store.controller.js

const buyItem = catchAsync(async (req, res) => {
  const currentUserId = req.user.id;
  console.log('Current User ID:', currentUserId);
  const { recipientUserId, durationOption } = req.body;

  if (!recipientUserId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Recipient user IDs are required', 'معرفات المستخدم المستفيد مطلوبة');
  }

  if (!durationOption) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Duration option is required', 'خيار المدة مطلوب');
  }

  const result = await storeService.buyItem(
    currentUserId,
    recipientUserId,
    req.params.itemId,
    durationOption
  );

  // Handle different response formats for special IDs vs regular items
  if (result.specialId) {
    res.send({
      message: 'Special ID purchased successfully',
      messageAr: 'تم شراء الرقم المميز بنجاح',
      statusCode: 200,
      success: result.success,
      specialId: result.specialId,
      remainingCredits: result.remainingCredits,
    });
  } else {
    res.send({
      message: 'Item purchase results',
      messageAr: 'نتائج شراء العنصر',
      statusCode: 200,
      results: result,
      remainingCredits: result.remainingCredits,
    });
  }
});

/**
 * Select a frame
 */
const selectItem = catchAsync(async (req, res) => {
  const item = await storeService.selectItem(req.user.id, req.params.itemId);
  res.send({
    message: 'Item selected',
    messageAr: 'تم اختيار العنصر',
    statusCode: 200,
    item,
  });
});

/**
 * Toggle item visibility in bag
 */
const toggleItemVisibility = catchAsync(async (req, res) => {
  const { itemId } = req.params;
  const item = await storeService.toggleItemVisibility(itemId);
  res.send({ message: 'Item visibility updated', statusCode: 200, item });
});

/*
 * edit item
 * @param {string} itemId
 * @param {object} itemBody
 */

const editItem = catchAsync(async (req, res) => {
  const itemBody = req.body;
  if (req.files) {
    if (req.files.image) {
      itemBody.image = req.files.image[0].location;
    }
    if (req.files.file) {
      itemBody.file = req.files.file[0].location;
    }
  }
  const item = await storeService.editItem(req.params.itemId, itemBody);
  res.send({ message: 'Item updated', statusCode: 200, item });
});

module.exports = {
  getStoreSections,
  getSectionByType,
  createItem,
  getUserBag,
  buyItem,
  selectItem,
  toggleItemVisibility,
  editItem,
};
