import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DomainEventsModule } from '../events/domain-events.module';
import { JOBS_QUEUE } from '../events/domain-event.types';
import { EventsProcessor } from '../events/events.processor';
import { ExportJobsProcessor } from './export-jobs.processor';

/** Worker-side only: never imported by the API app module. */
@Module({
  imports: [
    DomainEventsModule.forRoot('bullmq'),
    BullModule.registerQueue({ name: JOBS_QUEUE })
  ],
  providers: [EventsProcessor, ExportJobsProcessor]
})
export class JobsModule {}
