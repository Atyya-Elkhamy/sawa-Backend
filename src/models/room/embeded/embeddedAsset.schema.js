const mongoose = require('mongoose');

const embeddedAssetSchema = mongoose.Schema(
  {
    name: {
      type: String,
      default: 'Asset',
    },
    image: {
      type: String, // URL or path to the thumbnail
      default: '',
    },
    file: {
      type: String, // URL or path to the actual asset file
      default: '',
    },
    isPro: {
      type: Boolean,
      default: false,
    },
    id: {
      type: String,
      optional: true,
    },
  },
  { _id: false } // Prevent creation of an automatic _id for embedded documents
);

module.exports = embeddedAssetSchema;
