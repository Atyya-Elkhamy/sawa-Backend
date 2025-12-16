const mongoose = require('mongoose');

// Define the Profile schema
const profileSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    info: {
      about: { type: String, default: '' },
      album: [{ type: String, default: '' }],
      interests: [
        {
          id: { type: String, default: '1' },
          data: [{ type: String, default: '' }],
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

profileSchema.index({ user: 1 }, { unique: true });

// create

/**
 * @typedef Profile
 */
const Profile = mongoose.model('Profile', profileSchema);

module.exports = Profile;
