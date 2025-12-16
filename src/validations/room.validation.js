const Joi = require('joi');
const { objectId } = require('./custom.validation');
const generalRoomConfig = require('../config/room/general.config');

const createRoom = {
  body: Joi.object().keys({
    name: Joi.string().max(24).required(),
    announce: Joi.string()
      .max(500)
      .required()
      .messages({
        "any.required": "لا يمكن ترك الإعلان فارغًا",
        "string.empty": "لا يمكن ترك الإعلان فارغًا",
        "string.max": "الإعلان لا يمكن أن يتجاوز 500 حرف",
      }),
    roomCountryCode: Joi.string().length(2).required(),
    image: Joi.string().optional().allow(''),
  }),
  file: Joi.object().keys({
    image: Joi.string().required(),
  }),
};
const getRoom = {
  params: Joi.object().keys({
    roomId: Joi.string().custom(objectId).required(),
  }),
};
const updateRoomSettings = {
  params: Joi.object().keys({
    roomId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string().max(24).allow(''),
      subject: Joi.string().max(100).allow(''),
      announce: Joi.string().max(500).allow(''),
      description: Joi.string().max(500).allow(''),
      isPrivate: Joi.boolean().allow(''),
      password: Joi.string().allow(''),
      image: Joi.string().allow(''),
    })
    .min(1), // Ensure at least one field is being updated
  file: Joi.object().keys({
    image: Joi.string().optional(),
  }),
};

const updateCurrentState = {
  params: Joi.object().keys({
    roomId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      charizmaMode: Joi.boolean(),
      enterEffectEnabled: Joi.boolean(),
      hostMicEnabled: Joi.boolean(),
      guessGameEnabled: Joi.boolean(),
    })
    .min(1), // Ensure at least one field is provided
};

const deleteRoom = {
  params: Joi.object().keys({
    roomId: Joi.string().custom(objectId).required(),
  }),
};

const manageParticipants = {
  params: Joi.object().keys({
    roomId: Joi.string().custom(objectId).required(),
  }),
};
const manageModerator = {
  params: Joi.object().keys({
    roomId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    userId: Joi.string().custom(objectId).required(),
    remove: Joi.boolean(),
  }),
};

const removeModerator = {
  params: Joi.object().keys({
    roomId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    userId: Joi.string().custom(objectId).required(),
  }),
};

// special mics
const purchaseSpecialMic = {
  body: Joi.object().keys({
    micType: Joi.string()
      .required()
      .valid(...generalRoomConfig.specialMicEnum),
    durationOption: Joi.number().required().valid(7, 15, 30).default(7),
  }),
  params: Joi.object().keys({
    roomId: Joi.string().custom(objectId).required(),
  }),
};
const activateSpecialMic = {
  body: Joi.object().keys({
    micType: Joi.string()
      .required()
      .valid(...generalRoomConfig.specialMicEnum),
  }),
  params: Joi.object().keys({
    roomId: Joi.string().custom(objectId).required(),
  }),
};

const selectItem = {
  body: Joi.object().keys({
    id: Joi.string().custom(objectId).required(),
  }),
  params: Joi.object().keys({
    roomId: Joi.string().custom(objectId).required(),
  }),
};

const uploadBackgroundImage = {
  params: Joi.object().keys({
    roomId: Joi.string().custom(objectId).required(),
  }),
  file: Joi.object().keys({
    image: Joi.string(),
  }),
};

const purchaseOrSelectRoomType = {
  body: Joi.object().keys({
    type: Joi.string()
      .valid(...generalRoomConfig.RoomTypesArray)
      .required(),
  }),
  params: Joi.object().keys({
    roomId: Joi.string().custom(objectId).required(),
  }),
};

const changeMicState = {
  body: Joi.object().keys({
    micNumber: Joi.number().required(),
    state: Joi.string().valid(...generalRoomConfig.micStates),
  }),
  params: Joi.object().keys({
    roomId: Joi.string().custom(objectId).required(),
  }),
};

const hopOnMic = {
  params: Joi.object().keys({
    roomId: Joi.string().custom(objectId).required(),
    micNumber: Joi.number().required(),
  }),
};

const hopOffMic = {
  params: Joi.object().keys({
    roomId: Joi.string().custom(objectId).required(),
  }),
};

const setRoomPassword = {
  body: Joi.object().keys({
    password: Joi.string().required().allow(''),
  }),
};

const leaderboard = {
  params: Joi.object().keys({
    roomId: Joi.string().custom(objectId).required(),
  }),
  query: Joi.object().keys({
    type: Joi.string().valid('fame', 'rich').default('fame'),
    period: Joi.string().valid('today', 'week').default('today'),
  }),
};
const joinGame = {
  body: Joi.object().keys({
    gameId: Joi.string().required(),
  }),
};
const inviteUserToRoom = {
  body: Joi.object().keys({
    receiverId: Joi.string().custom(objectId).required(),
  }),
  params: Joi.object().keys({
    roomId: Joi.string().custom(objectId).required(),
  }),
};

const blockUser = {
  params: Joi.object().keys({
    roomId: Joi.string().required(),
  }),
  body: Joi.object().keys({
    userId: Joi.string().required(),
    permanent: Joi.boolean().required(),
  }),
};

const unblockUser = {
  params: Joi.object().keys({
    roomId: Joi.string().required(),
  }),
  body: Joi.object().keys({
    userId: Joi.string().required(),
  }),
};

const getBlockedUsers = {
  params: Joi.object().keys({
    roomId: Joi.string().required(),
  }),
  query: Joi.object().keys({
    page: Joi.number().integer().default(1),
    limit: Joi.number().integer().default(10),
  }),
};

const hostEndSession = {
  params: Joi.object().keys({
    roomId: Joi.string().required(),
    sessionId: Joi.string().required(),
  }),
};

const reserveMic = {
  params: Joi.object().keys({
    roomId: Joi.string().custom(objectId).required(),
    micNumber: Joi.number().required(),
  }),
};
const setRoomGame = {
  params: Joi.object().keys({
    roomId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    gameLink: Joi.string().uri().optional().allow(''),
    gameRoomId: Joi.string().required().allow(''),
    gameImage: Joi.string().uri().optional().allow(''),
  }),
};

const pkBaseSchema = Joi.object({
  pkTime: Joi.number().integer().min(10).max(3600).required(),

  pkMicsCount: Joi.number().integer().min(1).max(4).required(),

  pkMvpUser: Joi.object({
    mvpUserId: Joi.string().optional(),
    mvpUserImage: Joi.string().uri().optional(),
  }).optional().allow(null),

  pkMvpScore: Joi.number().integer().min(0).optional().allow(null).default(null),

  pkBlueTeam: Joi.object({
    teamMembersList: Joi.array().items(
      Joi.object({
        pkMemberId: Joi.string().required(),
        pkMemberCharsima: Joi.number().integer().min(0).required(),
      })
    ),
    teamTop3MembersList: Joi.array().items(
      Joi.object({
        userId: Joi.string().required(),
        userImage: Joi.string().uri().required(),
      })
    ),
    teamPoints: Joi.number().integer().min(0),
  }).required().allow(null),

  pkRedTeam: Joi.object({
    teamMembersList: Joi.array().items(
      Joi.object({
        pkMemberId: Joi.string().required(),
        pkMemberCharsima: Joi.number().integer().min(0).required(),
      })
    ),
    teamTop3MembersList: Joi.array().items(
      Joi.object({
        userId: Joi.string().required(),
        userImage: Joi.string().uri().required(),
      })
    ),
    teamPoints: Joi.number().integer().min(0),
  }).required().allow(null),
  pkBattelIsStarted: Joi.boolean().default(false),
});

const pkUpdateSchema = pkBaseSchema.fork(
  Object.keys(pkBaseSchema.describe().keys),
  (field) => field.optional()
);

const createPk = {
  params: Joi.object({
    roomId: Joi.string().custom(objectId).required(),
  }),
  body: pkBaseSchema.required(),
};

const updatePk = {
  params: Joi.object({
    roomId: Joi.string().custom(objectId).required(),
  }),
  body: pkUpdateSchema.min(1), // must update at least 1 field
};

const addTeamMember = {
  params: Joi.object().keys({
    roomId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      team: Joi.string().valid('blue', 'red').required(),
      member: Joi.object()
        .keys({
          pkMemberId: Joi.string().required(),
          pkMemberCharsima: Joi.number().integer().min(0).required(),
        })
        .required(),
    })
    .required(),
};


module.exports = {
  createRoom,
  getRoom,
  updateRoomSettings,
  deleteRoom,
  manageParticipants,
  manageModerator,
  removeModerator,
  purchaseSpecialMic,
  activateSpecialMic,
  selectItem,
  uploadBackgroundImage,
  updateCurrentState,
  purchaseOrSelectRoomType,
  changeMicState,
  hopOnMic,
  setRoomPassword,
  hopOffMic,
  leaderboard,
  joinGame,
  inviteUserToRoom,
  blockUser,
  unblockUser,
  getBlockedUsers,
  hostEndSession,
  reserveMic,
  setRoomGame,
  createPk,
  updatePk,
  addTeamMember,

};
