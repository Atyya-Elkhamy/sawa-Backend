const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { Group } = require('../models');

const groupAdminCheck = () => async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Group not found', 'المجموعة غير موجودة');
    }

    if (group.admin?.toString() != userId) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'Only group admin can perform this action',
        'يمكن لمسؤول المجموعة فقط تنفيذ هذا الإجراء'
      );
    }
    req.group = group;

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = groupAdminCheck; 