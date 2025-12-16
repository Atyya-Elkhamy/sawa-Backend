const mongoose = require('mongoose');

const forbiddenWordSchema = mongoose.Schema(
    {
        word: {
            type: String,
            required: true,
            trim: true,
            unique: true,
        },
        language: {
            type: String,
            enum: ['en', 'ar'],
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Create indexes for better performance
forbiddenWordSchema.index({ word: 1, language: 1 });

const ForbiddenWord = mongoose.model('ForbiddenWord', forbiddenWordSchema);

module.exports = ForbiddenWord; 