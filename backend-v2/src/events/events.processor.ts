import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { TenantContext } from '../tenant/tenant-context';
import {
  EVENTS_QUEUE,
  type DomainEvent
} from './domain-event.types';
import { EventHandlersRegistry } from './event-handlers.registry';

/**
 * Consumes domain events from BullMQ and dispatches them to registered
 * handlers inside the event's tenant context. This replaces the legacy
 * scattered `node-cron` jobs.
 */
@Processor(EVENTS_QUEUE)
export class EventsProcessor extends WorkerHost {
  private readonly logger = new Logger(EventsProcessor.name);

  constructor(private readonly registry: EventHandlersRegistry) {
    super();
  }

  async process(job: Job<DomainEvent>): Promise<void> {
    const event = job.data;
    const handler = this.registry.get(event.type);
    if (!handler) {
      this.logger.warn(`No handler registered for event '${event.type}'`);
      return;
    }
    if (event.organizationId) {
      await TenantContext.run(
        { organizationId: event.organizationId },
        () => handler(event)
      );
    } else {
      await handler(event);
    }
  }
}
