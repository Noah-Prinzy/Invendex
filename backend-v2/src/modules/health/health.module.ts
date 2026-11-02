import { Module } from '@nestjs/common';
import { ApiHealthController } from './health.controller';

@Module({
  controllers: [ApiHealthController]
})
export class HealthModule {}
