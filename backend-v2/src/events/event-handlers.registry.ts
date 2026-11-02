import { Injectable } from '@nestjs/common';
import type { DomainEventHandler } from './domain-event.types';

/** Worker-side registry mapping event types to handlers. */
@Injectable()
export class EventHandlersRegistry {
  private readonly handlers = new Map<string, DomainEventHandler>();

  register<T>(type: string, handler: DomainEventHandler<T>): void {
    this.handlers.set(type, handler as DomainEventHandler);
  }

  get(type: string): DomainEventHandler | undefined {
    return this.handlers.get(type);
  }
}
