import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const recoveryCodeSchema = new mongoose.Schema(
  {
    codeHash: {
      type: String,
      required: true,
      select: false
    },
    usedAt: {
      type: Date,
      default: null
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    mobileNumber: {
      type: String,
      default: null,
      trim: true
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
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
    uiTheme: {
      type: String,
      default: 'inventra-classic',
      trim: true
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
    twoFactor: {
      enabled: {
        type: Boolean,
        default: false
      },
      secret: {
        type: String,
        default: null,
        select: false
      },
      pendingSecret: {
        type: String,
        default: null,
        select: false
      },
      recoveryCodes: {
        type: [recoveryCodeSchema],
        default: [],
        select: false
      },
      pendingRecoveryCodeHashes: {
        type: [String],
        default: [],
        select: false
      },
      enabledAt: {
        type: Date,
        default: null
      },
      lastVerifiedAt: {
        type: Date,
        default: null
      }
    },

    refreshTokens: [
      {
        token: { type: String, required: true },
        sessionId: {
          type: String,
          trim: true,
          default: null
        },
        deviceId: {
          type: String,
          trim: true,
          default: null
        },
        userAgent: {
          type: String,
          trim: true,
          default: null
        },
        ipAddress: {
          type: String,
          trim: true,
          default: null
        },
        lastUsedAt: { type: Date, default: Date.now },
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

/**
 * ðŸ” Hash password before save
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  if (
    typeof this.password === 'string' &&
    /^\$2[aby]\$\d{2}\$/.test(this.password)
  ) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

/**
 * ðŸ”‘ Compare password
 */
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

/**
 * âž• Add refresh token
 */
userSchema.methods.addRefreshToken = function (token) {
  this.refreshTokens.push({ token });
};

/**
 * âž– Remove refresh token (single session logout)
 */
userSchema.methods.removeRefreshToken = function (token) {
  this.refreshTokens = this.refreshTokens.filter((rt) => rt.token !== token);
};

/**
 * âŒ Remove ALL refresh tokens (force logout)
 */
userSchema.methods.clearRefreshTokens = function () {
  this.refreshTokens = [];
};

userSchema.index({ organization: 1, isActive: 1 });

export default mongoose.model('User', userSchema);
