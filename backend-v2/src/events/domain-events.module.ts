import { Module, type DynamicModule, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import type { ConnectionOptions } from 'bullmq';
import {
  BullmqEventBus,
  DOMAIN_EVENT_BUS,
  InMemoryEventBus
} from './domain-event.bus';
import { EVENTS_QUEUE } from './domain-event.types';
import { EventHandlersRegistry } from './event-handlers.registry';

export type EventsDriver = 'bullmq' | 'memory';

@Module({})
export class DomainEventsModule {
  /** Reads EVENTS_DRIVER from the environment (memory in tests, bullmq otherwise). */
  static forEnvironment(): DynamicModule {
    return DomainEventsModule.forRoot(
      process.env.EVENTS_DRIVER === 'memory' ? 'memory' : 'bullmq'
    );
  }

  static forRoot(driver: EventsDriver): DynamicModule {
    const busProvider: Provider =
      driver === 'bullmq'
        ? { provide: DOMAIN_EVENT_BUS, useClass: BullmqEventBus }
        : { provide: DOMAIN_EVENT_BUS, useClass: InMemoryEventBus };

    return {
      module: DomainEventsModule,
      global: true,
      imports:
        driver === 'bullmq'
          ? [
              BullModule.registerQueueAsync({
                name: EVENTS_QUEUE,
                useFactory: (config: ConfigService) => ({
                  connection: config.get<string>(
                    'REDIS_URL'
                  ) as unknown as ConnectionOptions
                }),
                inject: [ConfigService]
              })
            ]
          : [],
      providers: [busProvider, EventHandlersRegistry],
      exports: [DOMAIN_EVENT_BUS, EventHandlersRegistry]
    };
  }
}
