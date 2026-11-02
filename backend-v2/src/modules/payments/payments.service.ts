import { Inject, Injectable } from '@nestjs/common';
import {
  MOBILE_MONEY_PROVIDER,
  type MobileMoneyProvider,
  type PaymentTransaction,
  type RequestToPayInput
} from './mobile-money-provider.interface';

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(MOBILE_MONEY_PROVIDER)
    private readonly provider: MobileMoneyProvider
  ) {}

  requestToPay(input: RequestToPayInput): Promise<PaymentTransaction> {
    return this.provider.requestToPay(input);
  }

  getTransactionStatus(reference: string): Promise<PaymentTransaction> {
    return this.provider.getTransactionStatus(reference);
  }

  handleWebhook(payload: unknown): Promise<void> {
    return this.provider.handleWebhook(payload);
  }
}
