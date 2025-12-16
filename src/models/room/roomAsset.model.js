const mongoose = require('mongoose');
const { ItemTypesArray } = require('../../config/room/general.config');

const roomAssetSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      default: null,
    },
    image: {
      type: String, // URL or file path to the thumbnail image
      required: true,
    },
    file: {
      type: String, // URL or file path to the actual asset file
      required: true,
    },
    isPro: {
      type: Boolean,
      default: false,
    },
    isHidden: {
      type: Boolean,
      default: false,
    },
    isGeneral: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      enum: ItemTypesArray,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const RoomAsset = mongoose.model('RoomAsset', roomAssetSchema);

module.exports = RoomAsset;
