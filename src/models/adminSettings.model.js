
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSettingsSchema = mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
            trim: true,
            private: true,
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
        },
        // NEW: Admin Role
        role: {
            type: String,
            enum: ['superadmin', 'manager', 'support', 'pd'],
            default: 'support',
        },
        // (Optional) Fine-grained Permissions
        permissions: {
            type: [String],
            default: [], // Example: ['read:users', 'edit:items', 'delete:messages']
        }
    },
    { timestamps: true }
);

// Password hashing
adminSettingsSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 8);
    }
    next();
});

adminSettingsSchema.methods.isPasswordMatch = async function (password) {
    return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('AdminSettings', adminSettingsSchema);
