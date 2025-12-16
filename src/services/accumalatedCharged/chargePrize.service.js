const httpStatus = require('http-status');
const ChargePrize = require('../../models/accumulatedCharge/prizes.charge.model');
const ApiError = require('../../utils/ApiError');

// Get a charge prize by ID
const getChargePrizeById = async (chargePrizeId) => {
  try {
    const chargePrize = await ChargePrize.findById(chargePrizeId).select('category items gifts requiredPoints vipLevel vipDays proMonths isActive').lean();

    if (!chargePrize) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Charge prize not found', 'الجائزة غير موجودة');
    }

    return chargePrize;
  } catch (error) {
    console.error('Error getting charge prize:', error.message);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Error getting charge prize', 'خطأ في الحصول على جائزة الشحن');
  }
};

// Get all charge prizes
const getAllChargePrizes = async () => {
  try {
    const prizes = await ChargePrize.find({ isActive: true })
      .populate('items.item gifts.gift')
      .select('name description category requiredPoints items gifts vipLevel vipDays proMonths isActive')
      .sort({ requiredPoints: 1 })
      .lean();
    const mergedPrizes = prizes.map((prize) => {
      const { items, gifts } = prize;
      const mergedItems = items
        .filter(({ item }) => item != null)
        .map(({ item, days, displayName }) => ({
          giftImage: item.image,
          giftFile: item.file,
          giftTime: days || 0,
          giftCount: 1,
          giftType: item.type,
          giftName: item.name,
          displayName: displayName || item.name,
        }));

      const mergedGifts = gifts
        .filter(({ gift }) => gift != null)
        .map(({ gift, quantity, displayName }) => ({
          giftImage: gift.image,
          giftFile: gift.file,
          giftTime: null,
          giftCount: quantity,
          giftType: "gift",
          giftName: gift.name,
          displayName: displayName || gift.name,
        }));

      const VipGift = prize.vipLevel > 0 && prize.vipDays > 0 ? [{
        giftImage: "",
        giftFile: "",
        giftTime: null,
        giftCount: 1,
        giftType: "vip",
        giftName: `${prize.vipDays} Days`,
        displayName: `${prize.vipDays} Days`,
      }] : [];

      const ProGift = prize.proMonths > 0 ? [{
        giftImage: "",
        giftFile: "",
        giftTime: null,
        giftCount: 1,
        giftType: "pro",
        giftName: `${prize.proMonths * 30} Days`,
        displayName: `${prize.proMonths * 30} Days`
      }] : [];

      // remove heavy arrays from the base prize object before returning
      const { items: _i, gifts: _g, ...rest } = prize;
      return { ...rest, gifts: [...mergedGifts, ...mergedItems, ...ProGift, ...VipGift] };
    });
    return mergedPrizes;
  } catch (error) {
    console.error('Error getting charge prizes:', error.message);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Error getting charge prizes', 'خطأ في الحصول على جوائز الشحن');
  }
};

const getChargePrizesBerCategory = async (category = 'weekly') => {
  try {
    const prizes = await ChargePrize.find({ category, isActive: true })
      .populate('items.item gifts.gift')
      .select('name description category requiredPoints items gifts vipLevel vipDays proMonths isActive')
      .sort({ requiredPoints: 1 })
      .lean();
    // merge the gifts and items in one array
    const mergedPrizes = prizes.map((prize) => {
      const { items, gifts } = prize;
      const mergedItems = items
        .filter(({ item }) => item != null)
        .map(({ item, days, displayName }) => ({
          giftImage: item?.image || '',
          giftFile: item?.file || '',
          giftTime: days || 0,
          giftCount: 1,
          giftType: item?.type || '',
          giftName: item?.name || '',
          displayName: displayName || item?.name || '',
        }));

      const mergedGifts = gifts
        .filter(({ gift }) => gift != null)
        .map(({ gift, quantity, displayName }) => ({
          giftImage: gift?.image || '',
          giftFile: gift?.file || '',
          giftTime: null,
          giftCount: quantity,
          giftType: "gift",
          giftName: gift?.name || '',
          displayName: displayName || gift?.name || '',
        }));


      const VipGift = prize.vipLevel > 0 && prize.vipDays > 0 ? [{
        giftImage: "",
        giftFile: "",
        giftTime: null,
        giftCount: 1,
        giftType: "vip",
        giftName: `${prize.vipDays} Days`,
        displayName: `${prize.vipDays} Days`,
      }] : [];

      const ProGift = prize.proMonths > 0 ? [{
        giftImage: "",
        giftFile: "",
        giftTime: null,
        giftCount: 1,
        giftType: "pro",
        giftName: `${prize.proMonths * 30} Days`,
        displayName: `${prize.proMonths * 30} Days`
      }] : [];

      const { items: _i, gifts: _g, ...rest } = prize;
      return { ...rest, gifts: [...mergedGifts, ...mergedItems, ...ProGift, ...VipGift] };
    });

    return mergedPrizes;
  } catch (error) {
    console.error('Error getting charge prizes:', error.message);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Error getting charge prizes', 'خطأ في الحصول على جوائز الشحن');
  }
};

// Generate a new 6-digit special ID from two DIFFERENT numbers (1–1500)
const generateSpecialId = () => {
  let n1 = Math.floor(Math.random() * 1500) + 1;
  let n2 = Math.floor(Math.random() * 1500) + 1;
  // Ensure different values
  while (n2 === n1) {
    n2 = Math.floor(Math.random() * 1500) + 1;
  }
  // Convert to padded strings (3 digits each → total length = 6)
  const p1 = n1.toString().padStart(3, "0");
  const p2 = n2.toString().padStart(3, "0");
  return p1 + p2; // 6-digit ID
};

const consumeSpecialId = async (itemIdValue) => {
  try {
    // Find the document containing this item (special ID)
    const doc = await ChargePrize.findOne({ "items.item": itemIdValue });
    if (!doc) {
      console.log("No special ID found to consume:", itemIdValue);
      return false;
    }
    // Remove the used item from the items array
    doc.items = doc.items.filter(i => i.item.toString() !== itemIdValue.toString());
    // Check if the array is empty after removal
    if (doc.items.length === 0) {
      // Delete this document only
      await ChargePrize.deleteOne({ _id: doc._id });
      console.log(`Document deleted because items array is empty: ${doc._id}`);
    } else {
      // Otherwise, save the updated document
      await doc.save();
      console.log(`Special ID item removed: ${itemIdValue}`);
    }
    return true;
  } catch (err) {
    console.error("Error removing special ID item:", err);
    return false;
  }
};






module.exports = {
  getChargePrizeById,
  getAllChargePrizes,
  getChargePrizesBerCategory,
  consumeSpecialId
};
