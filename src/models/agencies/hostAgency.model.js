const mongoose = require('mongoose');
const config = require('../../config/levels/hostTargets');
const logger = require('../../config/logger');

const agencySchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    agencyId: {
      type: String,
      unique: true,
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    currentDiamonds: {
      type: Number,
      default: 0,
    },
    blockSalaryTransfer: { type: Boolean, default: false },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);
// Virtual property to calculate expected salary based on a percentage of currentDiamonds
agencySchema.virtual('Salary').get(function () {
  // round floor to the nearest integer to prevent floating point errors
  return Math.floor(this.currentDiamonds * config.salaryConversionRates.agencyDiamondToUSD) || 0;
});
agencySchema.set('toJSON', { virtuals: true });
agencySchema.set('toObject', { virtuals: true });
// isNameTaken static method
agencySchema.statics.isNameTaken = async function (name) {
  const agency = await this.findOne({ name });
  return !!agency;
};
// pre remove middleware to delete all hosts associated with the agency and remove the users reference to the agency
agencySchema.pre('remove', async function (next) {
  logger.info(`Removing all hosts associated with agency ${this.name}`);
  await this.model('Host').deleteMany({ agency: this._id });
  await this.model('User').updateMany({ hostAgency: this._id }, { hostAgency: null, isAgencyHost: false, host: null });
  next();
});

// on create generate agencyId by uuid

const Agency = mongoose.model('Agency', agencySchema);

module.exports = Agency;
