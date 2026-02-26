import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      select: false
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'manager', 'staff'],
      default: 'staff'
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    passwordResetToken: {
      type: String,
      default: null,
      select: false
    },
    passwordResetExpiresAt: {
      type: Date,
      default: null,
      select: false
    },
    emailVerificationToken: {
      type: String,
      default: null,
      select: false
    },
    emailVerificationExpiresAt: {
      type: Date,
      default: null,
      select: false
    },

    refreshTokens: [
      {
        token: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

/**
 * 🔐 Hash password before save
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

/**
 * 🔑 Compare password
 */
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

/**
 * ➕ Add refresh token
 */
userSchema.methods.addRefreshToken = function (token) {
  this.refreshTokens.push({ token });
};

/**
 * ➖ Remove refresh token (single session logout)
 */
userSchema.methods.removeRefreshToken = function (token) {
  this.refreshTokens = this.refreshTokens.filter((rt) => rt.token !== token);
};

/**
 * ❌ Remove ALL refresh tokens (force logout)
 */
userSchema.methods.clearRefreshTokens = function () {
  this.refreshTokens = [];
};

userSchema.index({ organization: 1, isActive: 1 });

export default mongoose.model('User', userSchema);
