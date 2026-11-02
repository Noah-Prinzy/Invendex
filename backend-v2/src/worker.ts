import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';

async function bootstrap(): Promise<void> {
  await NestFactory.createApplicationContext(WorkerModule, {
    logger: ['log', 'error', 'warn']
  });
  console.log('Invendex backend-v2 worker running (BullMQ: domain events + heavy jobs)');
}

void bootstrap();
