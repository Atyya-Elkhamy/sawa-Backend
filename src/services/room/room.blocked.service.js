const httpStatus = require('http-status');
const RoomBlock = require('../../models/room/room.blocks.model');
const ApiError = require('../../utils/ApiError');
const userService = require('../user.service');
const { calculatePagination } = require('../../utils/pagination');

/**
 * Block a user from a room.
 * @param {string} roomId - ID of the room.
 * @param {string} userId - ID of the user to be blocked.
 * @param {boolean} permanent - Whether the block is permanent.
 * @returns {Promise<RoomBlock>} - The newly created RoomBlock document.
 */
const blockUser = async (roomId, userId, permanent = false) => {
  const existingBlock = await RoomBlock.findOne({ roomId, userId });

  if (existingBlock) {
    // update the block if its not permanent or make it permanent
    if (!existingBlock.permanent || permanent) {
      existingBlock.permanent = permanent;
      await existingBlock.save();
      return existingBlock;
    }
    // update the expiration date if the block is permanent
    const expirationDate = new Date(Date.now() + 3600);
    existingBlock.expiresAt = expirationDate;
    await existingBlock.save();
    return existingBlock;
  }

  const blockData = { roomId, userId, permanent };

  if (!permanent) {
    const expirationDate = new Date(Date.now() + 3600);
    blockData.expiresAt = expirationDate;
  }

  const block = await RoomBlock.create(blockData);
  return block;
};

/**
 * Unblock a user from a room.
 * @param {string} roomId - ID of the room.
 * @param {string} userId - ID of the user to be unblocked.
 * @returns {Promise<void>}
 */
const unblockUser = async (roomId, userId) => {
  const block = await RoomBlock.findOneAndDelete({ roomId, userId });

  if (!block) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User is not blocked in this room.', 'المستخدم غير محظور في هذه الغرفة');
  }
};

/**
 * Check if a user is blocked from a room.
 * @param {string} roomId - ID of the room.
 * @param {string} userId - ID of the user.
 * @returns {Promise<boolean>} - Whether the user is blocked.
 */
const isUserBlocked = async (roomId, userId) => {
  const block = await RoomBlock.findOne({ roomId, userId }).lean();

  if (!block) {
    return false;
  }

  if (block.permanent) {
    return true;
  }

  if (block.expiresAt && block.expiresAt < new Date()) {
    await RoomBlock.findOneAndDelete({ roomId, userId });
    return false;
  }

  return true;
};

/**
 * Get all blocked users for a room.
 * @param {string} roomId - ID of the room.
 * @param page
 * @param limit
 * @returns {Promise<RoomBlock[]>} - List of blocked users.
 */
const getBlockedUsers = async (roomId, page, limit) => {
  const blocks = await RoomBlock.find({ roomId })
    .select('userId permanent')
    .populate('userId', userService.userProjection)
    .skip((page - 1) * limit)
    .limit(limit);

  // Transform blocks to handle deleted users
  const transformedBlocks = userService.transformDeletedUsers(blocks, 'userId');

  const blockedCount = await RoomBlock.countDocuments({ roomId });

  const paginatedData = calculatePagination(blockedCount, page, limit);

  return {
    blockedUsers: transformedBlocks,
    ...paginatedData,
  };
};

module.exports = {
  blockUser,
  unblockUser,
  isUserBlocked,
  getBlockedUsers,
};
