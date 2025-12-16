// config/stores.config.js
const config = require('./config');

const ITEM_TYPES = {
  FRAME: 'frame',
  ENTER_EFFECT: 'enterEffect',
  TYPING_COLOR: 'typingColor',
  TYPING_BUBBLE: 'typingBubble',
  WING: 'wing',
  ROOM_FRAME: 'roomFrame',
  SPECIAL_ID: 'specialId',
  SOUND_EFFECT: 'soundEffect',
};

const stores = {
  frame: {
    sectionName: 'Frames',
    sectionNameAr: 'اطارات مميزة',
    sectionImage: `${config.app.url}public/assets/store-sections/frames.png`,
    type: ITEM_TYPES.FRAME,
  },
  enterEffect: {
    sectionName: 'Effects',
    sectionNameAr: 'تأثيرات الدخول',
    sectionImage: `${config.app.url}public/assets/store-sections/enterEffect.svg`,
    type: ITEM_TYPES.ENTER_EFFECT,
  },
  wing: {
    sectionName: 'Wings',
    sectionNameAr: 'أجنحة مميزة',
    sectionImage: `${config.app.url}public/assets/store-sections/wing.svg`,
    type: ITEM_TYPES.WING,
  },
  typingColor: {
    sectionName: 'Typing Colors',
    sectionNameAr: 'ألوان الكتابة',
    sectionImage: `${config.app.url}public/assets/store-sections/typingColor.svg`,
    type: ITEM_TYPES.TYPING_COLOR,
  },
  soundEffect: {
    sectionName: 'Sound Effects',
    sectionNameAr: 'تأثيرات صوتية',
    sectionImage: `${config.app.url}public/assets/store-sections/soundEffect.png`,
    type: ITEM_TYPES.SOUND_EFFECT,
  },
  specialId: {
    sectionName: 'Special IDs',
    sectionNameAr: 'الأيدي المميزة',
    sectionImage: `${config.app.url}public/assets/store-sections/specialId.svg`,
    type: ITEM_TYPES.SPECIAL_ID,
  },
  typingBubble: {
    sectionName: 'Typing Bubbles',
    sectionNameAr: 'فقاعات الكتابة',
    sectionImage: `${config.app.url}public/assets/store-sections/typingBubble.svg`,
    type: ITEM_TYPES.TYPING_BUBBLE,
  },
  roomFrame: {
    sectionName: 'Room Frames',
    sectionNameAr: 'إطارات الغرفة',
    sectionImage: `${config.app.url}public/assets/store-sections/roomFrame.svg`,
    type: ITEM_TYPES.ROOM_FRAME,
  },
};

const itemTypesArray = Object.values(ITEM_TYPES);
const validateType = (type) => itemTypesArray.includes(type);

const DurationOptions = {
  SEVEN_DAYS: 7,
  FIFTEEN_DAYS: 15,
  THIRTY_DAYS: 30,
};

const calculatePriceAndDuration = (basePrice, durationOption) => {
  switch (durationOption) {
    case DurationOptions.SEVEN_DAYS:
      return {
        price: basePrice,
        duration: 7,
      };
    case DurationOptions.FIFTEEN_DAYS:
      return {
        price: basePrice * 2 * 0.9, // 10% discount
        duration: 15,
      };
    case DurationOptions.THIRTY_DAYS:
      return {
        price: basePrice * 4 * 0.85, // 15% discount
        duration: 30,
      };
    default:
      throw new Error('Invalid duration option');
  }
};

// vip app entry effect
const vipMicEffects = {
  4: 'https://app.sawalive.live/public/assets/MicSpeakingEffect/micro_wave_vip4.svga',
  5: 'https://app.sawalive.live/public/assets/MicSpeakingEffect/micro_wave_vip5.svga',
  6: 'https://app.sawalive.live/public/assets/MicSpeakingEffect/micro_wave_vip6.svga',
  7: 'https://app.sawalive.live/public/assets/MicSpeakingEffect/micro_wave_vip7.svga',
};

const getVipMicEffect = (level) => {
  if (level < 4) return '';
  return vipMicEffects[level] || vipMicEffects[4];
};

module.exports = {
  stores,
  ITEM_TYPES,
  validateType,
  itemTypesArray,
  DurationOptions,
  calculatePriceAndDuration,
  vipMicEffects,
  getVipMicEffect,
};
