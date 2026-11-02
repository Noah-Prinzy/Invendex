import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import type { ConnectionOptions } from 'bullmq';
import type { Connection } from 'mongoose';
import { envSchema } from './config/env.schema';
import { mongooseTenantPlugin } from './tenant/mongoose-tenant.plugin';
import { DomainEventsModule } from './events/domain-events.module';
import { JobsModule } from './jobs/jobs.module';
import { AuditModule } from './modules/audit/audit.module';

/**
 * Worker application context: BullMQ processors for domain events and heavy
 * jobs (xlsx/pdfkit/bwip-js load here only). Run with `npm run worker`.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (env) => envSchema.parse(env)
    }),
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri:
          process.env.DB_URL ?? 'mongodb://127.0.0.1:27017/invendex',
        connectionFactory: (connection: Connection) => {
          connection.plugin(mongooseTenantPlugin);
          return connection;
        }
      })
    }),
    BullModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        connection: config.get<string>('REDIS_URL') as unknown as ConnectionOptions
      }),
      inject: [ConfigService]
    }),
    DomainEventsModule.forRoot('bullmq'),
    AuditModule,
    JobsModule
  ]
})
export class WorkerModule {}
