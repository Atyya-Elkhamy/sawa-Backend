// models/activity.model.js
const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  image: { type: String, required: true },
  link: { type: String, required: true },
  hidden: { type: Boolean, default: false },
});

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity;
