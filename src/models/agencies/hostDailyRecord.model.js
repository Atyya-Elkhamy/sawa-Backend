const mongoose = require('mongoose');
const config = require('../../config/levels/hostTargets');
// const hostService = require('../../services/agencies/host.service');

const hostDailyRecordSchema = mongoose.Schema(
  {
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Host',
      required: true,
    },
    agency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agency',
      required: true,
    },
    diamondsCollected: {
      type: Number,
      default: 0,
    },
    expectedDailySalary: {
      type: Number,
      default: 0,
    },
    day: {
      type: Date,
      required: true,
      default: () => {
        return new Date().setHours(0, 0, 0, 0);
      },
    },
  },
  {
    timestamps: true,
  }
);

hostDailyRecordSchema.index({ agency: 1, host: 1, day: 1 });
hostDailyRecordSchema.virtual('Salary').get(function () {
  const salary = Math.floor(this.diamondsCollected * config.salaryConversionRates.hostDiamondToUSD);
  return salary || 0;
});
// on save, update the host's expected salary
hostDailyRecordSchema.static('findOneOrCreate', async function findOneOrCreate(condition, doc) {
  const one = await this.findOne(condition);
  return one || this.create(doc);
});
module.exports = mongoose.model('HostDailyRecord', hostDailyRecordSchema);
