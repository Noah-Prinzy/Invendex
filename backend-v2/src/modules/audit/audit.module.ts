import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLogSchema } from '../../persistence/schemas/audit-log.schema';
import { AuditEventListener } from './audit.listener';
import { AuditService } from './audit.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'AuditLog', schema: AuditLogSchema }])
  ],
  providers: [AuditService, AuditEventListener],
  exports: [AuditService, MongooseModule]
})
export class AuditModule {}
