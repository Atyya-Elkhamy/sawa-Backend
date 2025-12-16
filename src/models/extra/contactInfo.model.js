// models/contact.model.js
const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      required: true,
    },
    language: {
      type: String,
    },
    available_time: {
      type: String,
    },
    countries: [
      {
        type: String,
        required: true,
      },
    ],
    whatsapp: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Contact = mongoose.model('Contact', contactSchema);

module.exports = Contact;
