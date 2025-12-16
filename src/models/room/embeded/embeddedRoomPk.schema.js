const mongoose = require('mongoose');

const PkMvpUserSchema = new mongoose.Schema(
    {
        mvpUserId: String,
        mvpUserImage: String,
    },
    { _id: false }
);

const TeamMemberSchema = new mongoose.Schema(
    {
        pkMemberId: String,
        pkMemberCharsima: Number,
    },
    { _id: false }
);

const TopMemberSchema = new mongoose.Schema(
    {
        userId: String,
        userImage: String,
    },
    { _id: false }
);

const TeamSchema = new mongoose.Schema(
    {
        teamMembersList: {
            type: [TeamMemberSchema],
            default: [],
        },
        teamTop3MembersList: {
            type: [TopMemberSchema],
            default: [],
        },
        teamPoints: {
            type: Number,
            default: 0,
        },
    },
    { _id: false }
);

const PkBattleModelSchema = new mongoose.Schema(
    {
        pkTime: Number,
        pkMicsCount: Number,
        pkMvpUser: PkMvpUserSchema,
        pkMvpScore: Number,
        pkBlueTeam: TeamSchema,
        pkRedTeam: TeamSchema,
        pkBattelIsStarted: {
            type: Boolean,
            default: false,
        },
        startedAt: {
            type: Date,
            default: null,
        },
        currentPkTime: {
            type: Number,
            default: null,
        },
    },
    { _id: false }
);

module.exports = {
    PkBattleModelSchema,
};
