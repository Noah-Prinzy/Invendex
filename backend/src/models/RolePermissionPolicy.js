import mongoose from 'mongoose';
import { PERMISSIONS } from '../authorization/permissions.js';

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

const permissionListField = {
  type: [String],
  enum: ALL_PERMISSIONS,
  default: []
};

const rolePermissionPolicySchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      unique: true,
      index: true
    },
    matrix: {
      staff: permissionListField,
      manager: permissionListField,
      admin: permissionListField
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true }
);

rolePermissionPolicySchema.index({ updatedAt: -1 });

export default mongoose.model(
  'RolePermissionPolicy',
  rolePermissionPolicySchema
);
