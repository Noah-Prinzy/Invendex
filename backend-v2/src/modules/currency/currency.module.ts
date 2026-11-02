import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExchangeRateSchema } from '../../persistence/schemas/exchange-rate.schema';
import { CurrencyController } from './currency.controller';
import { CurrencyService } from './currency.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'ExchangeRate', schema: ExchangeRateSchema }
    ])
  ],
  controllers: [CurrencyController],
  providers: [CurrencyService],
  exports: [CurrencyService, MongooseModule]
})
export class CurrencyModule {}
