const mongoose = require('mongoose');

const roomSpecialMicSchema = mongoose.Schema(
  {
    expirationDate: {
      type: Date,
      required: true,
      expires: 0,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    _purchasedState: {
      // Internal storage field
      type: Boolean,
      default: false,
    },
    ttlExpireAt: {
      type: Date,
      default() {
        return this.expirationDate;
      },
    },
  },
  {
    _id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual property for isPurchased with getter and setter
roomSpecialMicSchema
  .virtual('purchased')
  .get(function () {
    console.log('this._purchasedState', this._purchasedState, 'this.isExpired()', this.isExpired());
    return !this.isExpired() && this._purchasedState;
  })
  .set(function (value) {
    console.log('value', value);
    this._purchasedState = Boolean(value);
  });

// Method to check if expired
roomSpecialMicSchema.methods.isExpired = function () {
  return new Date() > this.expirationDate;
};

// Pre-save middleware
roomSpecialMicSchema.pre('save', function (next) {
  this.ttlExpireAt = this.expirationDate;

  if (this.isExpired()) {
    this.isActive = false;
    this._purchasedState = false; // Update internal state
  }
  next();
});

module.exports = roomSpecialMicSchema;
