export interface RequestToPayInput {
  amount: number;
  currency: string;
  phoneNumber: string;
  reference: string;
  description?: string;
}

export type PaymentStatus = 'pending' | 'successful' | 'failed';

export interface PaymentTransaction {
  reference: string;
  status: PaymentStatus;
  provider: string;
  phoneNumber: string;
  amount: number;
  currency: string;
  providerTransactionId: string | null;
  message: string | null;
}

/**
 * Mobile-money abstraction: MTN MoMo and Airtel Money, either directly or
 * through an aggregator (e.g. Flutterwave).
 */
export interface MobileMoneyProvider {
  readonly name: string;
  requestToPay(input: RequestToPayInput): Promise<PaymentTransaction>;
  getTransactionStatus(reference: string): Promise<PaymentTransaction>;
  handleWebhook(payload: unknown): Promise<void>;
}

export const MOBILE_MONEY_PROVIDER = Symbol('MOBILE_MONEY_PROVIDER');
