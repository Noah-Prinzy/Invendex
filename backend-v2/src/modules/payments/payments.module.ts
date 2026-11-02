import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import {
  AggregatorMobileMoneyProvider,
  AirtelMoneyProvider,
  MtnMomoProvider
} from './providers';
import {
  MOBILE_MONEY_PROVIDER,
  type MobileMoneyProvider
} from './mobile-money-provider.interface';

@Module({
  controllers: [PaymentsController],
  providers: [
    AggregatorMobileMoneyProvider,
    MtnMomoProvider,
    AirtelMoneyProvider,
    PaymentsService,
    {
      provide: MOBILE_MONEY_PROVIDER,
      useFactory: (
        config: ConfigService,
        aggregator: AggregatorMobileMoneyProvider,
        mtn: MtnMomoProvider,
        airtel: AirtelMoneyProvider
      ): MobileMoneyProvider => {
        switch (config.get<string>('MOBILE_MONEY_PROVIDER')) {
          case 'mtn':
            return mtn;
          case 'airtel':
            return airtel;
          default:
            return aggregator;
        }
      },
      inject: [
        ConfigService,
        AggregatorMobileMoneyProvider,
        MtnMomoProvider,
        AirtelMoneyProvider
      ]
    }
  ],
  exports: [PaymentsService]
})
export class PaymentsModule {}
