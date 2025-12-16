const mongoose = require('mongoose');
const { userProjection } = require('../../services/user.service');
const logger = require('../../config/logger');

const groupRelation = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['invite', 'request'],
    required: true,
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'joined', 'rejected', 'blocked'],
    default: 'pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

//accepted , denied, pending

// aggregate to get all requests paginated and the total count
// groupRelation.statics.paginateRequests = async function (groupId, page, limit) {
//   logger.info('Getting requests');
//   logger.info(groupId);
//   logger.info(page);
//   logger.info(limit);
//   const [results, itemCount] = await Promise.all([
//     this.find({ group: groupId, type: 'request', status: { $ne: 'accepted' } })
//       .sort({ createdAt: -1 })
//       .skip(limit * (page - 1))
//       .limit(limit)
//       .populate('user', userProjection)
//       .exec(),
//     this.countDocuments({
//       group: groupId,
//       type: 'request',
//       status: { $ne: 'accepted' },
//     }),
//   ]);

//   logger.info('Results');
//   logger.info(results);
//   logger.info(itemCount);

//   return {
//     results,
//     itemCount,
//   };
// };

groupRelation.statics.paginateRequests = async function (groupId, page, limit) {
  logger.info('Getting only pending requests');

  const filter = {
    group: groupId,
    type: 'request',
    status: 'pending',   // <-- ONLY pending
  };

  const [results, itemCount] = await Promise.all([
    this.find(filter)
      .sort({ createdAt: -1 })
      .skip(limit * (page - 1))
      .limit(limit)
      .populate('user', userProjection)
      .exec(),

    this.countDocuments(filter),
  ]);

  logger.info('Results');
  logger.info(results);
  logger.info(itemCount);

  return {
    results,
    itemCount,
  };
};


const GroupRelation = mongoose.model('GroupRelation', groupRelation);

module.exports = GroupRelation;
