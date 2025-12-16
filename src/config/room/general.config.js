const SpecialMics = ['vip', 'boss', 'king', 'host'];

const specialMicPrices = {
  7: 2000,
  15: 3000,
  30: 5000,
};
// make array of special mics keys
const specialMicEnum = ['vip', 'boss', 'king'];
const RoomMicState = ['noSpeaker', 'hasSpeaker', 'muted', 'locked'];
const IndexToSpecialMic = {
  1: 'host',
  3: 'vip',
  2: 'king',
  0: 'boss',
};
// check user pro < now
// from room bg and room mics set to defaulted value

const SpecialMicToIndex = {
  host: 1,
  vip: 3,
  king: 2,
  boss: 0,
};

const RoomTypes = {
  classicRoom: {
    name: 'classicRoom',
    maxMics: 5,
    price: 0,
    isPro: false,
  },
  hafla7Room: {
    name: 'hafla7Room',
    maxMics: 10,
    price: 0,
    isPro: false,
  },
  crnvalRoom: {
    name: 'crnvalRoom',
    maxMics: 15,
    price: 0, // Free for pro users
    isPro: true,
  },
  pKRoom: {
    name: 'pKRoom',
    maxMics: 10,
    price: 0, // Free for pro users
    isPro: false,
  },
  lamhAhbabRoom: {
    name: 'lamhAhbabRoom',
    maxMics: 12,
    price: 0, // Free for pro users
    isPro: true,
  },
  youtubeRoom: {
    name: 'youtubeRoom',
    maxMics: 8,
    price: 0, // Free for pro users
    isPro: true,
  },
  shareScreenRoom: {
    name: 'shareScreenRoom',
    maxMics: 10,
    price: 0, // Free for pro users
    isPro: true,
  },
};

const ItemTypes = {
  BACKGROUND: 'background',
  MIC_SHAPE: 'micShape',
};

/**
 * Array of ItemTypes
 * @type {string[]}
 */
const ItemTypesArray = Object.keys(ItemTypes).map((key) => ItemTypes[key]);

const RoomTypesArray = Object.keys(RoomTypes).map((key) => RoomTypes[key].name);

const micStates = ['noSpeaker', 'hasSpeaker', 'muted', 'locked'];

const proBackgroundIds = new Set(['1', '5']);
const proMicShapeIds = new Set(['2', '4']);

const broadcastCost = 2000;
const postMinimumLevel = 10;

const defaultBackground = {
  name: 'Default Background',
  image: '', // Replace with the actual default image URL
  file: '', // Replace with the actual default file URL
  isPro: false,
  id: 'default_id', // Replace with the actual default ID
};

const defaultMicShape = {
  name: 'Default Mic Shape',
  image: '', // Replace with the actual default image URL
  file: '', // Replace with the actual default file URL
  isPro: false,
  id: 'default_id', // Replace with the actual default ID
};
module.exports = {
  RoomTypes,
  RoomMicState,
  SpecialMics,
  RoomTypesArray,
  broadcastCost,
  specialMicPrices,
  specialMicEnum,
  proBackgroundIds,
  proMicShapeIds,
  ItemTypes,
  ItemTypesArray,
  IndexToSpecialMic,
  SpecialMicToIndex,
  micStates,
  postMinimumLevel,
  defaultBackground,
  defaultMicShape,
};
