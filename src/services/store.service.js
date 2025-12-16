// services/store.service.js

const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const BoughtItem = require('../models/boughtItem.model');
const Item = require('../models/item.model');
const User = require('../models/user.model');
const UserSpecialId = require('../models/userSpecialId.model');
const userService = require('./user.service');
const { stores, calculatePriceAndDuration, ITEM_TYPES } = require('../config/stores.config');
const logger = require('../config/logger');
const roomService = require('./room/room.service');
const Items = require('../models/item.model'); // Assuming Items is the same as Item, but if it's different, adjust accordingly
const chargePrizeService = require('./accumalatedCharged/chargePrize.service');

const itemSelection = 'name price image _id type file isTopProduct';

// Map item types to user model fields
const TYPE_TO_FIELD_MAP = {
  [ITEM_TYPES.FRAME]: 'frame',
  [ITEM_TYPES.ENTER_EFFECT]: 'enterEffect',
  [ITEM_TYPES.WING]: 'wing',
  [ITEM_TYPES.TYPING_COLOR]: 'typingColor',
  [ITEM_TYPES.ROOM_FRAME]: 'roomFrame',
  [ITEM_TYPES.SPECIAL_ID]: 'specialId',
  [ITEM_TYPES.TYPING_BUBBLE]: 'typingBubble',
  [ITEM_TYPES.SOUND_EFFECT]: 'soundEffect',
};
/**
 * Get all sections with their items
 * @returns {Promise<{ sections: Array }>}
 */

const getStoreSections = async () => {
  // Fetch all items grouped by their type
  const items = await Item.find({
    isHidden: false,
    isTopProduct: true,
    vipLevel: '0',
    // usedUntill null or less than current date
    $or: [{ usedUntil: null }, { usedUntil: { $lte: new Date() } }],
  }).select(itemSelection);

  // Group items by type
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item?.type]) {
      acc[item?.type] = [];
    }
    acc[item?.type].push(item);
    return acc;
  }, {});

  // Build sections with items
  const sections = Object.keys(stores).map((type) => ({
    sectionName: stores[type].sectionName,
    sectionNameAr: stores[type].sectionNameAr,
    sectionImage: stores[type].sectionImage,
    type: stores[type].type,
    items: groupedItems[type] || [],
  }));

  return sections;
};

/**
 * Get items by section type
 * @param {string} sectionType
 * @returns {Promise<Array>}
 */

const getSectionByType = async (sectionType) => {
  const items = await Item.find({
    type: sectionType,
    isHidden: false,
    vipLevel: '0',
    // usedUntill null or less than current date
    $or: [{ usedUntil: null }, { usedUntil: { $lte: new Date() } }],
  }).select(itemSelection);
  return items;
};

/**
 * Add a new item
 * @param {object} itemBody
 * @returns {Promise<Item>}
 */

const addItem = async (itemBody) => {
  logger.info('Adding item: %o', itemBody);
  const newItem = await Item.create(itemBody);
  return newItem;
};
/**
 * Get user's bought items
 * @param {string} userId
 * @returns {Promise<object>}
 */

const getMyBoughtItems = async (userId) => {
  console.log('Getting bought items for user:', userId);
  const boughtItems = await BoughtItem.find({ isHidden: false, user: userId })
    .populate({
      path: 'item',
      select: 'name price image _id type file',
    })
    .lean();
  // Get user's special IDs
  const userSpecialIds = await UserSpecialId.find({
    user: userId,
    expirationDate: { $gt: new Date() } // Only active/non-expired special IDs
  }).lean();
  if (!boughtItems && !userSpecialIds) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No items found', 'لا توجد عناصر');
  }
  // Group bought items by section type
  const groupedItems = boughtItems.reduce((acc, i) => {
    const sectionType = i.item?.type || 'unknown';
    if (!acc[sectionType]) {
      acc[sectionType] = [];
    }
    acc[sectionType].push({
      ...i.item,
      itemId: i.item._id,
      _id: i._id,
      expirationDate: i.expirationDate,
      isSelected: i.isSelected || false,
    });
    return acc;
  }, {});
  // Add user special IDs to the special ID section
  console.log('User special IDs:', userSpecialIds);
  if (userSpecialIds.length > 0) {
    if (!groupedItems[ITEM_TYPES.SPECIAL_ID]) {
      groupedItems[ITEM_TYPES.SPECIAL_ID] = [];
    }
    groupedItems[ITEM_TYPES.SPECIAL_ID] = [];
    userSpecialIds.forEach(specialId => {
      groupedItems[ITEM_TYPES.SPECIAL_ID].push({
        name: specialId.name,
        price: 0, // Special IDs don't have a price in this context
        image: '', // You can add a default special ID image if needed
        _id: specialId._id,
        type: ITEM_TYPES.SPECIAL_ID,
        file: specialId.value,
        itemId: specialId._id,
        expirationDate: specialId.expirationDate,
        isSelected: specialId.isActive || false, // Map isActive to isSelected
        isSpecialId: true, // Flag to identify special IDs
        vipLevel: specialId.vipLevel,
        source: specialId.source,
      });
    });

  }
  // Transform the grouped items into an array of sections with items
  // add all sections with their items even if no items in the section
  // Create sections in the same order as stores
  const itemsBySections = Object.keys(stores).map((sectionType) => ({
    sectionType,
    sectionName: stores[sectionType].sectionName,
    sectionNameAr: stores[sectionType].sectionNameAr,
    sectionImage: stores[sectionType].sectionImage,
    items: groupedItems[sectionType] || [],
  }));
  return {
    itemsBySections,
  };
};


/**
 * Add product to user's bought items
 * @param {string} userId
 * @param {ObjectId} itemId
 * @param {number} duration - Duration in days
 */

// const addProductToBoughtItems = async (userId, itemId, duration) => {
//   logger.info('Adding product to bought items: %o', { userId, itemId, duration });
//   const item = await Item.findById(itemId);
//   if (!item) {
//     throw new ApiError(httpStatus.NOT_FOUND, 'Item not found', 'العنصر غير موجود');
//   }
//   // Prevent special IDs from being added to bought items
//   // if (item.type === ITEM_TYPES.SPECIAL_ID) {
//   //   throw new ApiError(httpStatus.BAD_REQUEST, 'Special IDs cannot be added to bought items directly', 'لا يمكن إضافة الأرقام المميزة إلى العناصر المشتراة مباشرة');
//   // }
//   const currentDate = new Date();
//   let expirationDate = duration ? new Date(currentDate.getTime() + duration * 24 * 60 * 60 * 1000) : null;
//   // Check if the user already has this item
//   const existingBoughtItem = await BoughtItem.findOne({ user: userId, item: itemId });
//   if (existingBoughtItem) {
//     // If item exists and has expiration date, extend it
//     if (existingBoughtItem.expirationDate > currentDate) {
//       existingBoughtItem.expirationDate = new Date(
//         existingBoughtItem.expirationDate.getTime() + duration * 24 * 60 * 60 * 1000
//       );
//       expirationDate = existingBoughtItem.expirationDate;
//     } else {
//       existingBoughtItem.expirationDate = expirationDate;
//     }
//     await existingBoughtItem.save();
//   } else {
//     // Create a new bought item
//     const boughtItemData = {
//       user: userId,
//       item: itemId,
//       expirationDate,
//     };
//     await BoughtItem.create(boughtItemData);
//   }
//   logger.info(`Product added to bought items for user ${userId}: ${itemId}`);
//   return { success: true };
// };

// const addProductToBoughtItems = async (recipientUserId, itemId, duration, currentUserId = null) => {
//   logger.info('Adding product to bought items: %o', { recipientUserId, itemId, duration });
//   const item = await Item.findById(itemId);
//   if (!item) throw new ApiError(httpStatus.NOT_FOUND, 'Item not found', 'العنصر غير موجود');
//   const currentDate = new Date();
//   const expirationDate = duration ? new Date(currentDate.getTime() + duration * 24 * 60 * 60 * 1000) : null;
//   if (item.type === ITEM_TYPES.SPECIAL_ID) {
//     let specialId = await UserSpecialId.findOne({ user: recipientUserId, name: item.name });
//     if (specialId) {
//       if (duration && specialId.expirationDate > currentDate) {
//         specialId.expirationDate = new Date(specialId.expirationDate.getTime() + duration * 24 * 60 * 60 * 1000);
//         await specialId.save();
//       }
//       return { success: true, type: 'specialId', id: specialId._id };
//     }
//     specialId = new UserSpecialId({
//       user: recipientUserId,
//       name: item.name,
//       value: item.name,
//       expirationDate,
//       vipLevel: 1,
//       source: 'store_purchase',
//       metadata: { duration, purchasedBy: currentUserId, originalPrice: item.price || 0 },
//       isActive: false,
//     });
//     await specialId.save();
//     await chargePrizeService.consumeSpecialId(item._id);
//     logger.info(`Special ID added for user ${recipientUserId}: ${item.name}`);
//     let boughtItem = await BoughtItem.findOne({
//       user: recipientUserId,
//       item: itemId,
//       specialId: userSpecialId._id,
//     });
//     if (!boughtItem) {
//       boughtItem = await BoughtItem.create({
//         user: recipientUserId,
//         item: itemId,
//         specialId: userSpecialId._id,
//         expirationDate: specialId.expirationDate,
//         metadata: {
//           isSpecialId: true,
//           specialIdValue: specialId.value,
//           duration,
//           price: item.price || 0,
//         },
//       });
//       logger.info(`Special ID added to BoughtItem for user ${recipientUserId}: ${item.name}`);
//     }
//     return { success: true, type: 'specialId', id: specialId._id };
//   }
//   // Regular bought item
//   let boughtItem = await BoughtItem.findOne({ user: recipientUserId, item: itemId });
//   if (boughtItem) {
//     if (duration && boughtItem.expirationDate && boughtItem.expirationDate > currentDate) {
//       boughtItem.expirationDate = new Date(boughtItem.expirationDate.getTime() + duration * 24 * 60 * 60 * 1000);
//     } else {
//       boughtItem.expirationDate = expirationDate;
//     }
//     await boughtItem.save();
//   } else {
//     boughtItem = await BoughtItem.create({ user: recipientUserId, item: itemId, expirationDate });
//   }
//   logger.info(`Bought item added for user ${recipientUserId}: ${itemId}`);
//   return { success: true, type: 'boughtItem', id: boughtItem._id };
// };

const addProductToBoughtItems = async (recipientUserId, itemId, duration, currentUserId = null) => {
  const item = await Item.findById(itemId);
  if (!item) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Item not found', 'العنصر غير موجود');
  }

  const now = new Date();
  const expirationDate = duration
    ? new Date(now.getTime() + duration * 24 * 60 * 60 * 1000)
    : null;

  // SPECIAL ID
  if (item.type === ITEM_TYPES.SPECIAL_ID) {
    let userSpecial = await UserSpecialId.findOne({
      user: recipientUserId,
      value: item.name,
    });

    if (userSpecial) {
      // Extend or refresh expiration
      if (userSpecial.expirationDate > now) {
        userSpecial.expirationDate = new Date(
          userSpecial.expirationDate.getTime() + duration * 24 * 60 * 60 * 1000
        );
      } else {
        userSpecial.expirationDate = expirationDate;
      }
    } else {
      // Create new special ID
      userSpecial = new UserSpecialId({
        user: recipientUserId,
        name: item.name,
        value: item.name,
        expirationDate,
        vipLevel: 1,
        source: 'store_purchase',
        metadata: {
          duration,
          purchasedBy: currentUserId,
          originalPrice: item.price || 0,
        },
      });
    }

    await userSpecial.save();

    // BoughtItem linkage
    let boughtItem = await BoughtItem.findOne({
      user: recipientUserId,
      item: itemId,
      specialId: userSpecial._id,
    });

    if (!boughtItem) {
      boughtItem = new BoughtItem({
        user: recipientUserId,
        item: itemId,
        specialId: userSpecial._id,
        expirationDate: userSpecial.expirationDate,
        metadata: {
          specialIdValue: userSpecial.value,
          price: item.price || 0,
          duration,
        },
      });
    } else {
      boughtItem.expirationDate = userSpecial.expirationDate;
      boughtItem.metadata.duration = duration;
    }

    await boughtItem.save();

    return { success: true, type: 'specialId', id: userSpecial._id };
  }

  // REGULAR ITEM
  let boughtItem = await BoughtItem.findOne({ user: recipientUserId, item: itemId });

  if (boughtItem) {
    if (boughtItem.expirationDate && boughtItem.expirationDate > now) {
      // Extend
      boughtItem.expirationDate = new Date(
        boughtItem.expirationDate.getTime() + duration * 24 * 60 * 60 * 1000
      );
    } else {
      boughtItem.expirationDate = expirationDate;
    }
  } else {
    boughtItem = new BoughtItem({
      user: recipientUserId,
      item: itemId,
      expirationDate,
      metadata: { price: item.price || 0 },
    });
  }

  await boughtItem.save();

  return { success: true, type: 'boughtItem', id: boughtItem._id };
};


/**
 * Buy an item and add it to recipient's bought items
 * @param {string} currentUserId
 * @param {string} recipientUserId
 * @param {string} itemId
 * @param {number} durationOption
 */

// const buyItem = async (currentUserId, recipientUserId, itemId, durationOption) => {
//   // Fetch the item to be purchased
//   const item = await Item.findById(itemId);
//   if (!item) {
//     throw new ApiError(httpStatus.NOT_FOUND, 'Item not found', 'العنصر غير موجود');
//   }
//   if (item.usedUntil && item.usedUntil > new Date()) {
//     throw new ApiError(httpStatus.BAD_REQUEST, 'Item is already in use', 'العنصر قيد الاستخدام');
//   }
//   // Calculate price and duration based on the selected option
//   const { price: itemPrice, duration } = calculatePriceAndDuration(item.price, durationOption);
//   // Fetch the current authenticated user
//   const currentUser = await User.findById(currentUserId).select('credits');
//   if (!currentUser) {
//     throw new ApiError(httpStatus.NOT_FOUND, 'Current user not found', 'المستخدم الحالي غير موجود');
//   }
//   // Ensure the current user has enough credits to purchase for the recipient
//   const totalCost = itemPrice;
//   if (currentUser.credits < totalCost) {
//     throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient credits', 'رصيد غير كافي');
//   }
//   // Deduct the total cost from the current user's credits
//   await userService.deductUserBalance(
//     currentUserId,
//     totalCost,
//     `Buy item ${item.name || ''} for ${duration} days`,
//     `شراء عنصر ${item.name || ''} لمدة ${duration} يومًا`
//   );
//   // Handle special ID items differently
//   if (item.type === ITEM_TYPES.SPECIAL_ID) {
//     try {
//       // Create a UserSpecialId instead of adding to bought items
//       const expirationDate = new Date();
//       expirationDate.setDate(expirationDate.getDate() + duration);
//       // Check if the special ID value already exists in UserSpecialId
//       const existingUserSpecialId = await UserSpecialId.findOne({ value: item.name, user: recipientUserId });
//       if (existingUserSpecialId) {
//         existingUserSpecialId.expirationDate = expirationDate;
//       }
//       // Create the user special ID
//       const userSpecialId = new UserSpecialId({
//         user: recipientUserId,
//         name: item.name,
//         value: item.name, // The special ID value is stored in the name field
//         expirationDate,
//         vipLevel: 1, // Default VIP level for purchased special IDs
//         source: 'store_purchase',
//         metadata: {
//           duration: duration,
//           purchasedBy: currentUserId,
//           originalPrice: itemPrice,
//         },
//       });
//       await userSpecialId.save();
//       // Remove the item from store by marking it as used
//       item.usedUntil = expirationDate;
//       await item.save();

//       await BoughtItem.create({
//         user: recipientUserId,
//         item: item._id,
//         expirationDate,
//         metadata: {
//           isSpecialId: true,
//           specialIdValue: userSpecialId.value,
//           duration,
//           price: itemPrice,
//         },
//       });

//       logger.info(`Special ID ${item.file} purchased and assigned to user ${recipientUserId}`);
//       return {
//         success: true,
//         remainingCredits: Math.floor(currentUser.credits - totalCost),
//         specialId: userSpecialId
//       };
//     } catch (error) {
//       logger.error(`Error purchasing special ID: ${error.message}`);
//       throw new ApiError(httpStatus.BAD_REQUEST, error.message, 'خطأ في شراء الرقم المميز');
//     }
//   }

//   // For regular items, use the existing flow
//   try {
//     await addProductToBoughtItems(recipientUserId, itemId, duration);
//     return { success: true, remainingCredits: Math.floor(currentUser.credits - totalCost) };
//   } catch (error) {
//     return { success: false, error: error.message, remainingCredits: Math.floor(currentUser.credits - totalCost) };
//   }
// };

// const buyItem = async (currentUserId, recipientUserId, itemId, durationOption) => {
//   // Fetch the item to be purchased
//   const item = await Item.findById(itemId);
//   if (!item) {
//     throw new ApiError(httpStatus.NOT_FOUND, 'Item not found', 'العنصر غير موجود');
//   }
//   if (item.usedUntil && item.usedUntil > new Date()) {
//     throw new ApiError(httpStatus.BAD_REQUEST, 'Item is already in use', 'العنصر قيد الاستخدام');
//   }
//   // Calculate price and duration based on the selected option
//   const { price: itemPrice, duration } = calculatePriceAndDuration(item.price, durationOption);
//   // Fetch the current authenticated user
//   const currentUser = await User.findById(currentUserId).select('credits');
//   if (!currentUser) {
//     throw new ApiError(httpStatus.NOT_FOUND, 'Current user not found', 'المستخدم الحالي غير موجود');
//   }
//   // Ensure the current user has enough credits
//   const totalCost = itemPrice;
//   if (currentUser.credits < totalCost) {
//     throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient credits', 'رصيد غير كافي');
//   }
//   // Deduct credits
//   await userService.deductUserBalance(
//     currentUserId,
//     totalCost,
//     `Buy item ${item.name || ''} for ${duration} days`,
//     `شراء عنصر ${item.name || ''} لمدة ${duration} يومًا`
//   );
//   // Handle special ID items
//   if (item.type === ITEM_TYPES.SPECIAL_ID) {
//     try {
//       const expirationDate = new Date();
//       expirationDate.setDate(expirationDate.getDate() + duration);

//       let userSpecialId = await UserSpecialId.findOne({ value: item.name, user: recipientUserId });
//       if (userSpecialId) {
//         userSpecialId.expirationDate = expirationDate;
//       } else {
//         userSpecialId = new UserSpecialId({
//           user: recipientUserId,
//           name: item.name,
//           value: item.name,
//           expirationDate,
//           vipLevel: 1,
//           source: 'store_purchase',
//           metadata: {
//             duration,
//             purchasedBy: currentUserId,
//             originalPrice: itemPrice,
//           },
//         });
//       }
//       await userSpecialId.save();
//       item.usedUntil = expirationDate;
//       await item.save();
//       // Check BoughtItem for special ID to prevent duplicates
//       let boughtItem = await BoughtItem.findOne({
//         user: recipientUserId,
//         item: itemId,
//         specialId: userSpecialId._id,
//       });
//       if (!boughtItem) {
//         boughtItem = new BoughtItem({
//           user: recipientUserId,
//           item: itemId,
//           specialId: userSpecialId._id,
//           expirationDate: userSpecialId.expirationDate,
//           metadata: {
//             isSpecialId: true,
//             specialIdValue: userSpecialId.value,
//             duration,
//             price: itemPrice,
//           },
//         });
//         await boughtItem.save();
//         logger.info(`Special ID ${item.name} added to BoughtItem for user ${recipientUserId}`);
//       } else {
//         // Update expiration if already exists
//         boughtItem.expirationDate = userSpecialId.expirationDate;
//         boughtItem.metadata.duration = duration;
//         await boughtItem.save();
//       }
//       return {
//         success: true,
//         remainingCredits: Math.floor(currentUser.credits - totalCost),
//         specialId: userSpecialId,
//       };
//     } catch (error) {
//       logger.error(`Error purchasing special ID: ${error.message}`);
//       throw new ApiError(httpStatus.BAD_REQUEST, error.message, 'خطأ في شراء الرقم المميز');
//     }
//   }

//   // For regular items
//   try {
//     const boughtItem = await addProductToBoughtItems(recipientUserId, itemId, duration);
//     return {
//       success: true,
//       remainingCredits: Math.floor(currentUser.credits - totalCost),
//       boughtItem,
//     };
//   } catch (error) {
//     return {
//       success: false,
//       error: error.message,
//       remainingCredits: Math.floor(currentUser.credits - totalCost),
//     };
//   }
// };

const buyItem = async (currentUserId, recipientUserId, itemId, durationOption) => {
  // 1) Fetch item
  const item = await Item.findById(itemId);
  if (!item) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Item not found', 'العنصر غير موجود');
  }

  // Ensure item is not already locked
  if (item.usedUntil && item.usedUntil > new Date()) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Item is already in use', 'العنصر قيد الاستخدام');
  }

  // 2) Calculate price + duration
  const { price: itemPrice, duration } = calculatePriceAndDuration(item.price, durationOption);

  // 3) Fetch user + validate balance
  const user = await User.findById(currentUserId).select('credits');
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Current user not found', 'المستخدم الحالي غير موجود');
  }

  if (user.credits < itemPrice) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient credits', 'رصيد غير كافي');
  }

  // 4) Deduct balance
  await userService.deductUserBalance(
    currentUserId,
    itemPrice,
    `Buy item ${item.name}`,
    `شراء عنصر ${item.name}`
  );

  // 5) SPECIAL ID LOGIC
  if (item.type === ITEM_TYPES.SPECIAL_ID) {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + duration);

    // Does the user already own the same special ID?
    let specialIdDoc = await UserSpecialId.findOne({
      user: recipientUserId,
      value: item.name,
    });

    if (specialIdDoc) {
      // Extend expiration
      specialIdDoc.expirationDate = expirationDate;
    } else {
      // Create new special ID
      specialIdDoc = new UserSpecialId({
        user: recipientUserId,
        name: item.name,
        value: item.name,
        expirationDate,
        vipLevel: 1,
        source: 'store_purchase',
        metadata: {
          duration,
          purchasedBy: currentUserId,
          originalPrice: itemPrice,
        },
      });
    }

    await specialIdDoc.save();

    // Lock item itself
    item.usedUntil = expirationDate;
    await item.save();

    // Create or update BoughtItem entry
    let boughtItem = await BoughtItem.findOne({
      user: recipientUserId,
      item: itemId,
      specialId: specialIdDoc._id,
    });

    if (!boughtItem) {
      boughtItem = new BoughtItem({
        user: recipientUserId,
        item: itemId,
        specialId: specialIdDoc._id,
        expirationDate,
        metadata: {
          price: itemPrice,
          duration,
          specialIdValue: specialIdDoc.value,
        },
      });
    } else {
      boughtItem.expirationDate = expirationDate;
      boughtItem.metadata.duration = duration;
    }

    await boughtItem.save();

    return {
      success: true,
      remainingCredits: user.credits - itemPrice,
      // specialId: specialIdDoc,
    };
  }

  // 6) REGULAR ITEM LOGIC
  const boughtItem = await addProductToBoughtItems(recipientUserId, itemId, duration, currentUserId);

  return {
    success: true,
    remainingCredits: user.credits - itemPrice,
    boughtItem,
  };
};


/**
 * Select an item for a user
 * @param {string} userId
 * @param {string} itemId
 * @param {string} itemType - Type of item from ITEM_TYPES
 */

const selectItem = async (userId, itemId) => {
  // Check if this item is a special ID
  const userSpecialId = await UserSpecialId.findOne({ _id: itemId, user: userId });
  if (userSpecialId) {
    if (userSpecialId.expirationDate && userSpecialId.expirationDate < new Date()) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Special ID has expired', 'الرقم المميز قد انتهت صلاحيته');
    }
    if (userSpecialId.isActive) {
      await UserSpecialId.deactivateForUser(userId, userSpecialId._id);
      return { success: true, action: 'deactivated' };
    } else {
      await UserSpecialId.activateForUser(userId, userSpecialId._id);
      return { success: true, action: 'activated' };
    }
  }
  // Handle regular bought items
  const boughtItem = await BoughtItem.findById(itemId).populate({
    path: 'item',
    select: 'name price image _id type file',
  });
  if (!boughtItem || boughtItem.user?.toString() !== userId) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Item not found in your items', 'العنصر غير موجود في العناصر الخاصة بك');
  }
  // Check expiration
  if (boughtItem.expirationDate && boughtItem.expirationDate < new Date()) {
    await BoughtItem.findByIdAndDelete(itemId);
    throw new ApiError(httpStatus.BAD_REQUEST, 'Item has expired', 'العنصر قد انتهت صلاحيته');
  }
  const itemType = boughtItem.item?.type;
  const userField = TYPE_TO_FIELD_MAP[itemType];
  if (!userField) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid item type', 'نوع العنصر غير صالح');
  }
  // Handle unselection if already selected
  if (boughtItem.isSelected) {
    boughtItem.isSelected = false;
    await boughtItem.save();
    const userDoc = await User.findById(userId).select(userField);
    if (!userDoc) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
    }
    userDoc[userField] = { url: '', expirationDate: null };
    await userDoc.save();
    // If it's a room frame, clear it from the room
    if (itemType === 'roomFrame') {
      await roomService.clearRoomFrame(userId);
    }
    return { success: true, action: 'unselected' };
  }
  // Selecting the new item
  const user = await User.findById(userId).select(userField);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }
  logger.info(`Selecting item for user: ${userId}, item: ${itemId}, type: ${itemType}`);
  // Apply selection based on type
  if (itemType === 'typingColor') {
    user[userField] = { url: boughtItem.item.name, expirationDate: boughtItem.expirationDate };
    await user.save();
  } else if (itemType === 'roomFrame') {
    // Apply the frame to the user’s active room
    await roomService.updateRoomFrame(userId, boughtItem.item.file, boughtItem.expirationDate);
  } else {
    user[userField] = { url: boughtItem.item.file, expirationDate: boughtItem.expirationDate };
    await user.save();
  }
  // Unselect other items of the same type
  const typeItems = await Items.find({ type: itemType }).select('_id').lean();
  const typeItemIds = typeItems.map(i => i._id);
  await BoughtItem.updateMany(
    { user: userId, item: { $in: typeItemIds }, _id: { $ne: boughtItem._id } },
    { $set: { isSelected: false } }
  );
  boughtItem.isSelected = true;
  await boughtItem.save();
  logger.info(`Successfully selected item of type ${itemType} for user ${userId}`);
  return { success: true, action: 'selected' };
};

/**
 * Toggle item visibility in store
 * @param {string} itemId
 */

const toggleItemVisibility = async (itemId) => {
  const item = await Item.findById(itemId).select('isHidden');
  if (!item) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Item not found', 'العنصر غير موجود');
  }

  item.isHidden = !item.isHidden;
  await item.save();
  return item;
};

/**
 * Edit item
 * @param {string} itemId
 * @param {object} itemBody
 */

const editItem = async (itemId, itemBody) => {
  logger.info('Editing item: %o', itemBody);
  const updated = await Item.findByIdAndUpdate(itemId, itemBody, { new: true });
  return updated;
};

/**
 * Give VIP items to the user based on their VIP level
 * @param {string} userId
 * @param {number} vipLevel
 * @param {number} duration
 */

const giveVipItems = async (userId, vipLevel, duration) => {
  const level = vipLevel?.toString() || '0';
  if (level === '0') {
    return;
  }

  // Get VIP items but exclude special IDs (they should only be purchased)
  const items = await Item.find({
    vipLevel: level,
    type: { $ne: ITEM_TYPES.SPECIAL_ID }
  });

  if (!items || items.length === 0) {
    return;
  }

  await Promise.all(
    items.map(async (item) => {
      await addProductToBoughtItems(userId, item._id, duration);
    })
  );
};

module.exports = {
  getStoreSections,
  getSectionByType,
  addItem,
  addProductToBoughtItems,
  getMyBoughtItems,
  buyItem,
  selectItem,
  toggleItemVisibility,
  editItem,
  calculatePriceAndDuration,
  giveVipItems,
};
