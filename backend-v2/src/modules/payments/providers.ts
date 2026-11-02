import { Injectable, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  MobileMoneyProvider,
  PaymentTransaction,
  RequestToPayInput
} from './mobile-money-provider.interface';

/**
 * Aggregator provider (Flutterwave-style) covering both MTN MoMo and Airtel
 * Money. STUB — implementation phase wires real HTTP calls + webhook
 * signature verification.
 */
@Injectable()
export class AggregatorMobileMoneyProvider implements MobileMoneyProvider {
  readonly name = 'aggregator';

  constructor(private readonly config: ConfigService) {}

  async requestToPay(input: RequestToPayInput): Promise<PaymentTransaction> {
    throw new NotImplementedException(
      `Aggregator request-to-pay stub (base=${this.config.get<string>('MOBILE_MONEY_AGGREGATOR_BASE_URL')}, ref=${input.reference})`
    );
  }

  async getTransactionStatus(): Promise<PaymentTransaction> {
    throw new NotImplementedException('Aggregator status lookup stub');
  }

  async handleWebhook(): Promise<void> {
    throw new NotImplementedException('Aggregator webhook handling stub');
  }
}

/** Direct MTN MoMo (collection) API provider. STUB. */
@Injectable()
export class MtnMomoProvider implements MobileMoneyProvider {
  readonly name = 'mtn';

  async requestToPay(): Promise<PaymentTransaction> {
    throw new NotImplementedException('Direct MTN MoMo request-to-pay stub');
  }

  async getTransactionStatus(): Promise<PaymentTransaction> {
    throw new NotImplementedException('Direct MTN MoMo status lookup stub');
  }

  async handleWebhook(): Promise<void> {
    throw new NotImplementedException('Direct MTN MoMo webhook stub');
  }
}

/** Direct Airtel Money API provider. STUB. */
@Injectable()
export class AirtelMoneyProvider implements MobileMoneyProvider {
  readonly name = 'airtel';

  async requestToPay(): Promise<PaymentTransaction> {
    throw new NotImplementedException(
      'Direct Airtel Money request-to-pay stub'
    );
  }

  async getTransactionStatus(): Promise<PaymentTransaction> {
    throw new NotImplementedException('Direct Airtel Money status lookup stub');
  }

  async handleWebhook(): Promise<void> {
    throw new NotImplementedException('Direct Airtel Money webhook stub');
  }
}
