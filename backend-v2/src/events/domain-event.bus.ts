import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { TenantContext } from '../tenant/tenant-context';
import {
  EVENTS_QUEUE,
  type DomainEvent,
  type DomainEventHandler
} from './domain-event.types';

export const DOMAIN_EVENT_BUS = Symbol('DOMAIN_EVENT_BUS');

export interface DomainEventBus {
  publish<T>(
    type: string,
    payload: T,
    options?: { organizationId?: string | null; delayMs?: number }
  ): Promise<void>;
  registerHandler<T>(type: string, handler: DomainEventHandler<T>): void;
}

/** In-process driver used in tests (EVENTS_DRIVER=memory). */
@Injectable()
export class InMemoryEventBus implements DomainEventBus {
  private readonly handlers = new Map<string, DomainEventHandler[]>();

  async publish<T>(
    type: string,
    payload: T,
    options: { organizationId?: string | null; delayMs?: number } = {}
  ): Promise<void> {
    const event: DomainEvent<T> = {
      id: randomUUID(),
      type,
      organizationId: options.organizationId ?? null,
      payload,
      occurredAt: new Date().toISOString()
    };
    const handlers = this.handlers.get(type) ?? [];
    for (const handler of handlers) {
      const run = (): Promise<void> => Promise.resolve(handler(event));
      if (event.organizationId) {
        await TenantContext.run(
          { organizationId: event.organizationId },
          run
        );
      } else {
        await run();
      }
    }
  }

  registerHandler<T>(type: string, handler: DomainEventHandler<T>): void {
    const list = this.handlers.get(type) ?? [];
    list.push(handler as DomainEventHandler);
    this.handlers.set(type, list);
  }
}

/** Production driver: domain events go through BullMQ (consumed by the worker). */
@Injectable()
export class BullmqEventBus implements DomainEventBus {
  constructor(@InjectQueue(EVENTS_QUEUE) private readonly queue: Queue) {}

  async publish<T>(
    type: string,
    payload: T,
    options: { organizationId?: string | null; delayMs?: number } = {}
  ): Promise<void> {
    const event: DomainEvent<T> = {
      id: randomUUID(),
      type,
      organizationId: options.organizationId ?? null,
      payload,
      occurredAt: new Date().toISOString()
    };
    await this.queue.add(type, event, {
      delay: options.delayMs,
      removeOnComplete: 1000,
      removeOnFail: 5000
    });
  }

  registerHandler(): void {
    throw new Error(
      'BullMQ driver dispatches on the worker; register handlers in the EventsProcessor registry'
    );
  }
}
