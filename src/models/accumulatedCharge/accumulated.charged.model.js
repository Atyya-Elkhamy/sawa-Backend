const mongoose = require('mongoose');

const { Schema } = mongoose;

const accumulatedSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  weeklyAccumulated: {
    type: Number,
    default: 0,
  },
  weeklyAvailable: {
    type: Number,
    default: 0,
  },
  monthlyAccumulated: {
    type: Number,
    default: 0,
  },
  monthlyAvailable: {
    type: Number,
    default: 0,
  },
});

// Method to update or create accumulated points
accumulatedSchema.statics.updateAccumulation = async function (userId, amountToAdd) {
  try {
    let accumulated = await this.findOne({ user: userId });

    if (!accumulated) {
      accumulated = new this({ user: userId });
    }

    accumulated.weeklyAccumulated += amountToAdd;
    accumulated.weeklyAvailable += amountToAdd;
    accumulated.monthlyAccumulated += amountToAdd;
    accumulated.monthlyAvailable += amountToAdd;

    await accumulated.save();
    return accumulated;
  } catch (error) {
    console.error('Error updating accumulation:', error.message);
    throw error;
  }
};

// Method to get accumulated points for a user, create new if not found
accumulatedSchema.statics.getAccumulation = async function (userId) {
  try {
    let accumulated = await this.findOne({ user: userId });

    if (!accumulated) {
      accumulated = new this({ user: userId });
      await accumulated.save();
    }

    return accumulated;
  } catch (error) {
    console.error('Error getting accumulation:', error.message);
    return { weeklyAccumulated: 0, weeklyAvailable: 0, monthlyAccumulated: 0, monthlyAvailable: 0 };
  }
};

// Method to reset accumulated points
accumulatedSchema.statics.resetAccumulated = async function (period = 'weekly') {
  try {
    if (period === 'weekly') {
      await this.updateMany({}, { weeklyAvailable: 0, weeklyAccumulated: 0 });
    } else if (period === 'monthly') {
      await this.updateMany({}, { monthlyAvailable: 0, monthlyAccumulated: 0 });
    }
  } catch (error) {
    console.error('Error resetting accumulated points:', error.message);
    throw error;
  }
};

// Method to get top 3 users with highest accumulated points
accumulatedSchema.statics.getTopThree = async function (period = 'weekly') {
  try {
    const sortField = period === 'weekly' ? 'weeklyAccumulated' : 'monthlyAccumulated';
    return this.find({ [sortField]: { $gt: 0 } })
      .sort({ [sortField]: -1 })
      .limit(3)
      .populate('user', 'name frame userId avatar');
  } catch (error) {
    console.error('Error getting top three users:', error.message);
    throw error;
  }
};

const Accumulated = mongoose.model('Accumulated', accumulatedSchema);

module.exports = Accumulated;
