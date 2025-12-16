const httpStatus = require('http-status');
const catchAsync = require('../../utils/catchAsync');
// const roomService = require('../../services/room/room.service');
const roomSpecialMicService = require('../../services/room/room.special-mics.service');
const roomItemsService = require('../../services/room/room.items.service');
const generalRoomConfig = require('../../config/room/general.config');
const { profileService } = require('../../services');
const RoomAsset = require('../../models/room/roomAsset.model');
const ApiError = require('../../utils/ApiError');
const Room = require('../../models/room/room.model');
/**
 * Purchase special mic
 */
const purchaseSpecialMic = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const roomId = req.room.id;
  const { micType, durationOption } = req.body;

  const result = await roomSpecialMicService.purchaseSpecialMic(userId, roomId, micType, Number(durationOption));
  res.status(httpStatus.OK).send(result);
});

/**
 * Activate special mic
 */
const toggleSpecialMic = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const roomId = req.room.id;
  const { micType } = req.body;

  const result = await roomSpecialMicService.toggleSpecialMic(userId, roomId, micType);
  res.status(httpStatus.OK).send(result);
});

/**
 * Get special mics for a room
 */
const getSpecialMics = catchAsync(async (req, res) => {
  const roomId = req.room.id;

  const purchased = await roomSpecialMicService.getSpecialMics(roomId);
  res.status(httpStatus.OK).send({ purchased, pricing: generalRoomConfig.specialMicPrices });
});

/**
 * select background image
 */
const selectItem = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const roomId = req.room.id;
  const { id } = req.body;

  const asset = await RoomAsset.findById(id).select('isPro name image file id type roomId isGeneral');
  // if is pro item, check if user is pro
  // if the asset is not general or haves roomId, check if its the same as roomId
  if (asset && asset.roomId && asset.roomId?.toString() != roomId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have access to this item', 'ليس لديك حق الوصول إلى هذا العنصر');
  }
  if (!asset) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Item not found', 'العنصر غير موجود');
  }
  if (asset.isPro) {
    await profileService.checkProAccess(userId);
  }
  const result = await roomItemsService.selectItem(roomId, asset, asset.type);
  res.status(httpStatus.OK).send(result);
});

// upload background image for room // pro users only
const uploadBackgroundImage = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const roomId = req.room.id;
  await profileService.checkProAccess(userId);
  if (!req.file) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Image is required', 'الصورة مطلوبة');
  }
  const image = req.file.location;
  // add to room assets
  const roomAsset = await RoomAsset.create({
    name: req.file.originalname,
    type: 'background',
    roomId,
    image,
    file: image,
    isPro: true,
    isGeneral: false, // not a general asset
  });
  // remove old background image if more than 5
  const roomAssets = await RoomAsset.find({ roomId, type: 'background' }).sort({ createdAt: -1 });
  if (roomAssets.length > 5) {
    const oldAsset = roomAssets[roomAssets.length - 1];
    await RoomAsset.deleteOne({ _id: oldAsset._id });
  }
  const data = {
    name: req.file.originalname,
    image,
    file: image,
    isPro: true,
    id: roomAsset._id,
  };
  const result = await roomItemsService.selectItem(roomId, data, 'background');
  res.status(httpStatus.OK).send(result);
});

const getRoomAssets = catchAsync(async (req, res) => {
  const type = req.query.type || 'background';

  const { roomId } = req.params;
  // : roomId Or null
  const match = { isHidden: false, $or: [{ roomId: null }, { isGeneral: true }] };
  if (roomId) {
    // equal to roomId  or null  | isGeneral true
    match.$or.push({ roomId });
  }

  if (type) {
    match.type = type;
  }

  const assets = await RoomAsset.find(match).select('name image file isPro');
  console.log('assets', assets);

  const room = await Room.findById(roomId).select('background micShape');

  let selectedAsset;
  let selectedAssetIndex;
  if (room) {
    selectedAsset = room[type];
  }

  if (selectedAsset) {
    selectedAssetIndex = assets.findIndex((asset) => asset.id == selectedAsset.id) || null;
    if (selectedAssetIndex === -1) {
      selectedAssetIndex = null;
    }
  }

  res.status(httpStatus.OK).send({
    assets,
    selectedAsset,
    selectedAssetIndex: selectedAssetIndex || null,
  });
});

// const purchaseOrSelectRoomType = catchAsync(async (req, res) => {
//   const { roomId } = req.params;
//   const { type } = req.body;
//   const userId = req.user.id;
//   const room = await roomItemsService.purchaseOrSelectRoomType(roomId, userId, type);
//   // change room background to default
//   const { defaultBackground } = generalRoomConfig;
//   await roomItemsService.selectItem(roomId, defaultBackground, 'background');
//   res.status(httpStatus.OK).send({ message: 'Room type updated successfully', room });
// });

const purchaseOrSelectRoomType = catchAsync(async (req, res) => {
  const { roomId } = req.params;
  const { type } = req.body;
  const userId = req.user.id;
  const room = await roomItemsService.purchaseOrSelectRoomType(
    roomId,
    userId,
    type
  );
  res.status(httpStatus.OK).send({
    message: 'Room type updated successfully',
    room,
  });
});


const getRoomTypes = catchAsync(async (req, res) => {
  const roomTypes = generalRoomConfig.RoomTypes;

  res.status(httpStatus.OK).send(roomTypes);
});

module.exports = {
  purchaseSpecialMic,
  toggleSpecialMic,
  getSpecialMics,
  selectItem,
  uploadBackgroundImage,
  getRoomAssets,
  purchaseOrSelectRoomType,
  getRoomTypes,
};
