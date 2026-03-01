import mongoose from 'mongoose';

const quietHoursSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: false
    },
    start: {
      type: String,
      default: '22:00',
      trim: true
    },
    end: {
      type: String,
      default: '06:00',
      trim: true
    }
  },
  { _id: false }
);

const organizationSettingsSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    },
    companyProfile: {
      timezone: {
        type: String,
        default: 'UTC',
        trim: true
      },
      currencyCode: {
        type: String,
        default: 'UGX',
        trim: true,
        uppercase: true
      },
      dateFormat: {
        type: String,
        enum: ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'],
        default: 'YYYY-MM-DD'
      },
      vatRateDefault: {
        type: Number,
        min: 0,
        max: 100,
        default: 18
      }
    },
    notifications: {
      lowStockEmailEnabled: {
        type: Boolean,
        default: false
      },
      lowStockSmsEnabled: {
        type: Boolean,
        default: false
      },
      lowStockRecipients: {
        type: [String],
        default: []
      },
      quietHours: {
        type: quietHoursSchema,
        default: () => ({})
      }
    },
    inventory: {
      defaultWarehouse: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Warehouse',
        default: null
      },
      enforceWarehouseForAdjustments: {
        type: Boolean,
        default: true
      },
      sensitiveAdjustmentMinRole: {
        type: String,
        enum: ['staff', 'manager', 'admin', 'owner'],
        default: 'manager'
      },
      allowNegativeStock: {
        type: Boolean,
        default: false
      },
      deadStockThresholdDays: {
        type: Number,
        default: 90,
        min: 1,
        max: 3650
      }
    },
    finance: {
      valuationMethod: {
        type: String,
        enum: ['FIFO', 'LIFO', 'WEIGHTED_AVG'],
        default: 'WEIGHTED_AVG'
      },
      taxInclusivePricing: {
        type: Boolean,
        default: false
      }
    },
    userAccess: {
      defaultInviteExpiryHours: {
        type: Number,
        default: 72,
        min: 1,
        max: 720
      },
      defaultEmployeeRole: {
        type: String,
        enum: ['staff', 'manager'],
        default: 'staff'
      },
      allowStaffProductCreation: {
        type: Boolean,
        default: true
      },
      allowStaffSoftDeleteOnly: {
        type: Boolean,
        default: true
      }
    },
    securitySession: {
      sessionIdleTimeoutMinutes: {
        type: Number,
        default: 60,
        min: 5,
        max: 1440
      },
      refreshTokenTtlDays: {
        type: Number,
        default: 7,
        min: 1,
        max: 60
      },
      passwordMinLength: {
        type: Number,
        default: 8,
        min: 8,
        max: 64
      },
      loginMaxAttempts: {
        type: Number,
        default: 5,
        min: 3,
        max: 20
      },
      lockoutDurationMinutes: {
        type: Number,
        default: 15,
        min: 1,
        max: 120
      }
    },
    realtimeOffline: {
      realtimeEnabled: {
        type: Boolean,
        default: true
      },
      autoReconnectEnabled: {
        type: Boolean,
        default: true
      },
      offlineQueueAutoSync: {
        type: Boolean,
        default: true
      },
      offlineQueueRetrySeconds: {
        type: Number,
        default: 30,
        min: 5,
        max: 600
      }
    },
    auditBackup: {
      auditRetentionDays: {
        type: Number,
        default: 365,
        min: 30,
        max: 3650
      },
      backupSchedule: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
        default: 'daily'
      },
      backupRetentionDays: {
        type: Number,
        default: 30,
        min: 7,
        max: 3650
      },
      requireRestoreApproval: {
        type: Boolean,
        default: true
      }
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true }
);

organizationSettingsSchema.index({ organization: 1 }, { unique: true });

export default mongoose.model(
  'OrganizationSettings',
  organizationSettingsSchema
);
