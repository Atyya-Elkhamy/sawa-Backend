const mongoose = require('mongoose');

const groupContributionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        group: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Group',
            required: true,
        },
        points: {
            type: Number,
            default: 0,
            set: v => Number(v),
        },
        roomId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Room',
            default: null,
            required: false,
        },
        date: {
            type: Date,
            default: Date.now,
        },
        day: {
            type: Number,
            default: () => new Date().getDate(),
        },
        month: {
            type: Number,
            default: () => new Date().getMonth(),
        },
    },
    {
        timestamps: true,
    }
);

// Create compound index for efficient querying
groupContributionSchema.index({ user: 1, group: 1, day: 1, month: 1 });

const GroupContribution = mongoose.model('GroupContribution', groupContributionSchema);

module.exports = GroupContribution; 