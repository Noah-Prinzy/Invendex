import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RolePermissionPolicySchema } from '../../persistence/schemas/role-permission-policy.schema';
import { PermissionPolicyService } from './permission-policy.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'RolePermissionPolicy', schema: RolePermissionPolicySchema }
    ])
  ],
  providers: [PermissionPolicyService],
  exports: [PermissionPolicyService, MongooseModule]
})
export class RbacModule {}
