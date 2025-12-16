const httpStatus = require('http-status');
const Room = require('../../models/room/room.model');
const ApiError = require('../../utils/ApiError');
const RoomAsset = require('../../models/room/roomAsset.model');
const generalRoomConfig = require('../../config/room/general.config');
const userService = require('../user.service');
const profileService = require('../profile.service');
/**
 * select background image
 * @param {string} roomId
 * @param {object} item
 * @param {string} type
 * @returns {Promise<Room>}
 */

const selectItem = async (roomId, item, type = 'background') => {
  const room = await Room.findById(roomId).select('background micShape');
  if (!room) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Room not found', 'الغرفة غير موجودة');
  }
  room[type] = {
    name: item.name,
    image: item.image,
    file: item.file,
    isPro: item.isPro,
    id: item.id || item._id,
  };
  await room.save();
  return room[type];
};

const getRoomAssets = async (type = 'background') => {
  const assets = await RoomAsset.find({
    type,
    isHidden: false,
  }).select('name image file isPro');
  return assets;
};


const purchaseOrSelectRoomType = async (roomId, userId, type = 'classic') => {
  const roomTypeConfig = generalRoomConfig.RoomTypes[type];
  console.log('the roooooooooom tpy is ', roomTypeConfig);
  console.log('the roooooooooom tpy is ', type);
  if (!roomTypeConfig) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid room type', 'نوع الغرفة غير صالح');
  }
  // Check Pro Access only when needed
  if (roomTypeConfig.isPro) {
    await profileService.checkProAccess(userId);
  }
  const { defaultBackground, defaultMicShape } = generalRoomConfig;
  // ONE ATOMIC UPDATE (Fastest)
  const updatedRoom = await Room.findByIdAndUpdate(
    roomId,
    {
      $set: {
        roomType: type,
        background: defaultBackground,
        micShape: defaultMicShape,
        gameImage: '',
        gameRoomId: '',
        gameLink: '',
      },
    },
    {
      new: true,
      select: 'roomType background micShape purchasedRoomTypes',
    }
  );
  if (!updatedRoom) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Room not found', 'الغرفة غير موجودة');
  }
  return updatedRoom;
};


module.exports = {
  selectItem,
  getRoomAssets,
  purchaseOrSelectRoomType,
};
