const Host = require('../../models/agencies/host.model');
const HostDailyRecord = require('../../models/agencies/hostDailyRecord.model');
const { hostService } = require('..');
const Agency = require('../../models/agencies/hostAgency.model');

/**
 * Get target stats for a single user for the day
 * @param {ObjectId} userId - User ID
 * @param hostId
 * @param day
 * @returns {Promise<object>}
 */
const getTargetStatsForHost = async (hostId, day = new Date()) => {
  const host = await Host.findById(hostId).select('agency');
  const results = await HostDailyRecord.findOneOrCreate(
    {
      host: hostId,
      day: new Date(day).setHours(0, 0, 0, 0),
    },
    {
      host: hostId,
      agency: host.agency,
      day: new Date(day).setHours(0, 0, 0, 0),
    }
  );

  return results;
};

const hostReceivedGift = async (hostId, price) => {
  const todayStart = new Date().setHours(0, 0, 0, 0); // Start of the day
  try {
    // Find the host and update their diamonds in same call
    const host = await Host.findByIdAndUpdate(
      hostId,
      { $inc: { currentDiamonds: price } },
      { new: true }
    );

    // Find the agency and increase its currentDiamonds in same call
    await Agency.findByIdAndUpdate(
      host.agency,
      { $inc: { currentDiamonds: price } },
      { new: true }
    );


    // Find or create the host's daily record for today
    const record = await HostDailyRecord.findOneAndUpdate(
      { host: hostId, day: todayStart },
      {
        $inc: { diamondsCollected: price }, // Increment diamonds collected
        $setOnInsert: {
          agency: host.agency,
          host: hostId,
          day: todayStart,
        },
      },
      { upsert: true, new: true } // Upsert and return the updated document
    );

    // Update the expected daily salary based on the total diamonds collected
    record.expectedDailySalary = hostService.getHostSalary(record.diamondsCollected);
    await record.save();
  } catch (error) {
    console.error(error);
  }
};

module.exports = {
  getTargetStatsForHost,
  hostReceivedGift,
};
