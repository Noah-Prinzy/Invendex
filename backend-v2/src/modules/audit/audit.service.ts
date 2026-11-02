import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { TenantContext } from '../../tenant/tenant-context';
import type { IAuditLog } from '../../persistence/schemas/audit-log.schema';

export interface AuditEntry {
  organizationId?: string | null;
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  success?: boolean;
  meta?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel('AuditLog') private readonly auditModel: Model<IAuditLog>
  ) {}

  /** Never breaks the request/job lifecycle on failure. */
  async log(entry: AuditEntry): Promise<void> {
    try {
      const doc = {
        organization: entry.organizationId ?? null,
        user: entry.userId ?? null,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId ?? null,
        success: entry.success ?? true,
        meta: entry.meta ?? {},
        ip: entry.ip ?? null,
        userAgent: entry.userAgent ?? null
      };
      if (entry.organizationId) {
        await TenantContext.run({ organizationId: entry.organizationId }, () =>
          this.auditModel.create(doc)
        );
      } else {
        const model = new this.auditModel(doc);
        await model.save({ tenantBypass: true } as Parameters<
          typeof model.save
        >[0]);
      }
    } catch (error) {
      this.logger.error(
        `Audit log failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
