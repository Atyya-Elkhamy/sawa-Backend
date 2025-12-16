const HostActivity = require('../models/hostActivity.model');
/**
 * Get total time spent by a host in a room
 * @param {ObjectId} roomId - Room ID
 * @param {ObjectId} hostId - Host ID
 * @returns {Promise<object>}
 */
const getHostTotalTime = async (roomId, hostId) => {
  const activities = await HostActivity.find({ room: roomId, host: hostId });

  const totalTime = activities.reduce((total, activity) => total + activity.timeSpent, 0);

  return {
    hostId,
    totalTime, // in seconds
    roomId,
  };
};

/**
 * Get historical activity data for a host in a room
 * @param {ObjectId} roomId - Room ID
 * @param {ObjectId} hostId - Host ID
 * @returns {Promise<Array>}
 */
const getHostActivityHistory = async (roomId, hostId) => {
  const activities = await HostActivity.find({ room: roomId, host: hostId })
    .populate('room', 'name')
    .populate('host', 'name avatar');

  return activities.map((activity) => ({
    host: activity.host,
    room: activity.room,
    joinedAt: activity.joinedAt,
    leftAt: activity.leftAt,
    timeSpent: activity.timeSpent, // in seconds
  }));
};

module.exports = {
  getHostTotalTime,
  getHostActivityHistory,
};
