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
      enum: ['admin', 'staff'],
      default: 'staff'
    },
    isVerified: {
      type: Boolean,
      default: false
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
  this.refreshTokens = this.refreshTokens.filter(
    rt => rt.token !== token
  );
};

/**
 * ❌ Remove ALL refresh tokens (force logout)
 */
userSchema.methods.clearRefreshTokens = function () {
  this.refreshTokens = [];
};

export default mongoose.model('User', userSchema);