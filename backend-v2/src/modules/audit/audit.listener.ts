import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import {
  DOMAIN_EVENT_BUS,
  InMemoryEventBus,
  type DomainEventBus
} from '../../events/domain-event.bus';
import {
  DomainEventTypes,
  type DomainEvent
} from '../../events/domain-event.types';
import { EventHandlersRegistry } from '../../events/event-handlers.registry';
import { AuditService } from './audit.service';

/**
 * Writes audit entries for auth domain events. With the in-memory driver the
 * handler runs in-process; with BullMQ it is registered on the worker's
 * EventsProcessor.
 */
@Injectable()
export class AuditEventListener implements OnModuleInit {
  constructor(
    @Inject(DOMAIN_EVENT_BUS) private readonly bus: DomainEventBus,
    private readonly registry: EventHandlersRegistry,
    private readonly audit: AuditService
  ) {}

  onModuleInit(): void {
    for (const type of [
      DomainEventTypes.AUTH_REGISTERED,
      DomainEventTypes.AUTH_LOGIN,
      DomainEventTypes.AUTH_LOGOUT
    ]) {
      const handler = async (event: DomainEvent): Promise<void> => {
        const payload = (event.payload ?? {}) as Record<string, unknown>;
        await this.audit.log({
          organizationId: event.organizationId,
          userId: typeof payload.userId === 'string' ? payload.userId : null,
          action: type.toUpperCase().replace(/\./g, '_'),
          resource: 'AUTH',
          success: true,
          meta: { payload }
        });
      };
      this.registry.register(type, handler);
      if (this.bus instanceof InMemoryEventBus) {
        this.bus.registerHandler(type, handler);
      }
    }
  }
}
