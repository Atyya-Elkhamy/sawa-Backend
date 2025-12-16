const mongoose = require('mongoose');

const hostAgencyInviteSchema = new mongoose.Schema({
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
  status: {
    type: String,
    enum: ['pending', 'accepted', 'denied'],
    default: 'pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const HostAgencyInvite = mongoose.model('HostAgencyInvite', hostAgencyInviteSchema);

module.exports = HostAgencyInvite;
