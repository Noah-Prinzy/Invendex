import mongoose, { Schema, type Document } from 'mongoose';
import { PERMISSIONS } from '../../modules/rbac/permissions';

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

const permissionListField = {
  type: [String],
  enum: ALL_PERMISSIONS,
  default: []
};

export interface IRolePermissionPolicy extends Document {
  organization: mongoose.Types.ObjectId;
  matrix: {
    staff: string[];
    manager: string[];
    admin: string[];
  };
  updatedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export const RolePermissionPolicySchema = new Schema<IRolePermissionPolicy>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      unique: true
    },
    matrix: {
      staff: permissionListField,
      manager: permissionListField,
      admin: permissionListField
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

RolePermissionPolicySchema.index({ organization: 1 }, { unique: true });
RolePermissionPolicySchema.index({ updatedAt: -1 });
