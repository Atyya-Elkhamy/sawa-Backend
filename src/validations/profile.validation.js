const Joi = require('joi');
const { objectId } = require('./custom.validation');

const getPublicProfile = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

const getUserProfile = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

const updateProfileSettings = {
  body: Joi.object().keys({
    friendsMessages: Joi.boolean().required(),
    systemMessages: Joi.boolean().required(),
    giftsFromPossibleFriends: Joi.boolean().required(),
    addFollowers: Joi.boolean().required(),
  }),
};
const deleteUser = {
  body: Joi.object().keys({
    password: Joi.string().optional().allow('', null),
  }),
};

// validations/contact.validation.js
const addContact = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    language: Joi.string().required(),
    available_time: Joi.string().required(),
    countries: Joi.string() // Accepts the JSON string
      .custom((value, helpers) => {
        try {
          const countries = JSON.parse(value);
          if (!Array.isArray(countries)) {
            throw new Error('countries must be an array');
          }
          return countries;
        } catch (err) {
          return helpers.message('Invalid countries array');
        }
      })
      .required(),
    whatsapp: Joi.string().required(),
  }),
  file: Joi.any(),
};

const editContact = {
  body: Joi.object().keys({
    name: Joi.string().optional(),
    language: Joi.string().optional(),
    available_time: Joi.string().optional(),
    countries: Joi.string() // Accepts the JSON string
      .custom((value, helpers) => {
        try {
          const countries = JSON.parse(value);
          if (!Array.isArray(countries)) {
            throw new Error('countries must be an array');
          }
          return countries;
        } catch (err) {
          return helpers.message('Invalid countries array');
        }
      })
      .optional(),
    whatsapp: Joi.string().optional(),
  }),
  file: Joi.any(),
};
const aboutValidation = {
  body: Joi.object({
    data: Joi.string().required(),
  }),
};
const addAlbumValidation = {
  body: Joi.object().keys({
    edited: Joi.string().required(),
  }),
  file: Joi.any().required(),
};

// Validation schema for album
const albumValidation = {
  body: Joi.object({
    data: Joi.array().items(Joi.string().uri()).required(),
  }),
};

const interestsValidation = {
  body: Joi.object({
    interests: Joi.array()
      .items(
        Joi.object({
          id: Joi.string(),
          data: Joi.array().items(Joi.string()),
        })
      )
      .required(),
  }),
};

// Validation schema for editing profile
const profileValidation = {
  body: Joi.object({
    name: Joi.string().optional().allow('', null),
    countryCode: Joi.string().optional().allow('', null),
    dateOfBirth: Joi.date().optional().allow('', null),
    isMale: Joi.boolean().optional().allow('', null),
  }),
  file: Joi.any(),
};

const deleteAlbumImageValidation = {
  body: Joi.object({
    image: Joi.string().required(),
  }),
};

// Validation schema for sorting album
const sortAlbumValidation = {
  body: Joi.object({
    sortedAlbum: Joi.array().items(Joi.string()).required(),
  }),
};
module.exports = {
  getPublicProfile,
  getUserProfile,
  updateProfileSettings,
  deleteUser,
  addContact,
  editContact,
  aboutValidation,
  albumValidation,
  interestsValidation,
  profileValidation,
  sortAlbumValidation,
  deleteAlbumImageValidation,
  addAlbumValidation,
};
