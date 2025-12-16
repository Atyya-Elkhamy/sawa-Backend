const mongoose = require('mongoose');
const config = require('../../config/levels/hostTargets');
const toJSON = require('../plugins/toJSON.plugin');
const paginate = require('../plugins/paginate.plugin');

const hostSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    agency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agency',
      required: true,
    },
    currentDiamonds: { type: Number, default: 0 },
    blockSalaryTransfer: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Virtual property to calculate expected salary based on a percentage of currentDiamonds
hostSchema.virtual('Salary').get(function () {
  // round floor to the nearest integer to prevent floating point errors
  return Math.floor(this.currentDiamonds * config.salaryConversionRates.hostDiamondToUSD) || 0;
});

// Plugin to convert mongoose documents to JSON and handle pagination
hostSchema.plugin(toJSON);
hostSchema.plugin(paginate);

// Unique index to ensure one host per agency
hostSchema.index({ user: 1, agency: 1 }, { unique: true });

hostSchema.set('toJSON', { virtuals: true });

const Host = mongoose.model('Host', hostSchema);

module.exports = Host;
