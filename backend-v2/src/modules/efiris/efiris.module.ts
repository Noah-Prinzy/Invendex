import { Module } from '@nestjs/common';
import { EfrisController } from './efiris.controller';
import { EfrisService } from './efiris.service';

@Module({
  controllers: [EfrisController],
  providers: [EfrisService],
  exports: [EfrisService]
})
export class EfrisModule {}
