const mongoose = require('mongoose');
const crypto = require('crypto');
// Define the schema for API Keys
const apiKeySchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  game: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    default: null, // Set to null if keys don't expire
  },
  active: {
    type: Boolean,
    default: true,
  },
});

// Generate a new API key for a game
apiKeySchema.statics.generateKey = async function (gameId) {
  const key = crypto.randomBytes(32).toString('hex');
  const newApiKey = await this.create({ key, game: gameId });
  return newApiKey;
};

// Validate an API key
apiKeySchema.statics.validateKey = async function (key) {
  const apiKey = await this.findOne({ key, active: true });
  if (!apiKey) {
    throw new Error('Invalid or inactive API key');
  }
  if (apiKey.expiresAt && apiKey.expiresAt < Date.now()) {
    apiKey.active = false;
    await apiKey.save();
    throw new Error('API key expired');
  }
  return apiKey;
};

const ApiKey = mongoose.model('ApiKey', apiKeySchema);

module.exports = ApiKey;
