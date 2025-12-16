const httpStatus = require('http-status');
const Activity = require('../models/extra/activity.model'); // Assuming the Activity model is defined
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

/**
 * Get all activities
 * @param {object} req
 * @param {object} res
 * @param {Function} next
 * @returns {Promise<void>}
 */
const getActivities = catchAsync(async (req, res) => {
  const activities = await Activity.find({
    hidden: false,
  });
  res.status(httpStatus.OK).send(activities);
});

/**
 * Add a new activity
 * @param {object} req
 * @param {object} res
 * @param {Function} next
 * @returns {Promise<void>}
 */
const addActivity = catchAsync(async (req, res) => {
  const requestBody = req.body;
  if (req.file) {
    requestBody.image = req.file.location;
  }
  const activity = await Activity.create(requestBody);
  res.status(httpStatus.CREATED).send(activity);
});

/**
 * Edit an activity
 * @param {object} req
 * @param {object} res
 * @param {Function} next
 * @returns {Promise<void>}
 */
const editActivity = catchAsync(async (req, res) => {
  const requestBody = req.body;
  if (req.file) {
    requestBody.image = req.file.location;
  }
  const activity = await Activity.findById(req.params.activityId);
  if (!activity) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Activity not found', 'النشاط غير موجود');
  }
  Object.assign(activity, requestBody);
  await activity.save();
  res.status(httpStatus.OK).send(activity);
});

/**
 * Delete an activity
 * @param {object} req
 * @param {object} res
 * @param {Function} next
 * @returns {Promise<void>}
 */
const deleteActivity = catchAsync(async (req, res) => {
  const activity = await Activity.findById(req.params.activityId);
  if (!activity) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Activity not found', 'النشاط غير موجود');
  }
  await activity.deleteOne();
  res.status(httpStatus.OK).send({ message: 'Activity deleted successfully' });
});

const getActivityById = catchAsync(async (req, res) => {
  const activity = await Activity.findById(req.params.activityId);
  if (!activity) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Activity not found', 'النشاط غير موجود');
  }
  res.status(httpStatus.OK).send(activity);
});
module.exports = {
  getActivities,
  addActivity,
  editActivity,
  deleteActivity,
  getActivityById,
};
