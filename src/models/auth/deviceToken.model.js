const mongoose = require('mongoose');

const deviceTokenTypes = {
  PHONE: 'phone',
  GOOGLE: 'google',
  FACEBOOK: 'facebook',
};

// Define nested schemas with all fields and required
const hardwareSchema = new mongoose.Schema(
  {
    board: { type: String, required: true },
    bootloader: { type: String, required: true },
    brand: { type: String, required: true },
    device: { type: String, required: true },
    fingerprint: { type: String, required: true },
    hardware: { type: String, required: true },
    host: { type: String, required: true },
    id: { type: String, required: true },
    manufacturer: { type: String, required: true },
    model: { type: String, required: true },
    product: { type: String, required: true },
    tags: { type: String, required: true },
    type: { type: String, required: true },
    systemFeatures: { type: [String], required: true },
    supportedAbis: { type: [String], required: true },
    supported32BitAbis: { type: [String], required: true },
    supported64BitAbis: { type: [String], required: true },
    sdkInt: { type: Number, required: true },
    release: { type: String, required: true },
    codename: { type: String, required: true },
    name: { type: String },
    systemName: { type: String },
    systemVersion: { type: String },
    localizedModel: { type: String },
    identifierForVendor: { type: String },
    machine: { type: String },
    nodename: { type: String },
    sysname: { type: String },
    version: { type: String },
  },
  { _id: false }
);

const systemSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true },
    operatingSystem: { type: String, required: true },
    androidId: { type: String, required: true },
    isEmulator: { type: Boolean, required: true },
  },
  { _id: false }
);

const appSchema = new mongoose.Schema(
  {
    appName: { type: String, required: true },
    packageName: { type: String, required: true },
    version: { type: String, required: true },
    buildNumber: { type: String, required: true },
    buildSignature: { type: String, required: true },
  },
  { _id: false }
);

const attributesSchema = new mongoose.Schema(
  {
    hardware: { type: hardwareSchema, required: true },
    system: { type: systemSchema, required: true },
    app: { type: appSchema, required: true },
  },
  { _id: false }
);

const deviceTokenSchema = new mongoose.Schema(
  {
    token: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    type: { type: String, enum: Object.values(deviceTokenTypes), default: deviceTokenTypes.PHONE, required: true },
    attributes: { type: attributesSchema },
    blacklisted: { type: Boolean, default: false },
    blackListExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

// Static Methods_
deviceTokenSchema.statics.isBlacklisted = async function (token) {
  const deviceToken = await this.findOne({ token, blacklisted: true });
  const now = new Date();
  if (!deviceToken) return false;
  if (deviceToken.blacklisted && !deviceToken.blackListExpires) return true;
  if (deviceToken.blackListExpires && deviceToken.blackListExpires < now) {
    deviceToken.blacklisted = false;
    deviceToken.blackListExpires = null;
    await deviceToken.save();
    return false;
  }
  return !!deviceToken.blacklisted;
};

deviceTokenSchema.statics.isTokenTaken = async function (token, type) {
  const deviceToken = await this.findOne({ token, type });
  return !!deviceToken;
};

const DeviceToken = mongoose.model('DeviceToken', deviceTokenSchema);
module.exports = DeviceToken;
module.exports.deviceTokenTypes = deviceTokenTypes;
