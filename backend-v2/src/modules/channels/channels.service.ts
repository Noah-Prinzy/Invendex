import { Injectable, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface OutboundMessage {
  to: string;
  body: string;
}

export interface UssdPayload {
  sessionId: string;
  phoneNumber: string;
  text: string;
}

/**
 * Channel abstraction over WhatsApp (Business API), SMS (Africa's Talking /
 * Termii) and USSD (feature phones). STUBS — provider clients land in the
 * implementation phase; the HTTP contract is fixed now.
 */
@Injectable()
export class ChannelsService {
  constructor(private readonly config: ConfigService) {}

  async sendWhatsApp(message: OutboundMessage): Promise<never> {
    throw new NotImplementedException(
      `WhatsApp channel stub (provider=${this.config.get<string>('WHATSAPP_PROVIDER')}, to=${message.to})`
    );
  }

  async sendSms(message: OutboundMessage): Promise<never> {
    throw new NotImplementedException(
      `SMS channel stub (provider=${this.config.get<string>('SMS_PROVIDER')}, to=${message.to})`
    );
  }

  async handleUssd(payload: UssdPayload): Promise<never> {
    throw new NotImplementedException(
      `USSD session stub (provider=${this.config.get<string>('USSD_PROVIDER')}, code=${this.config.get<string>('USSD_SHORT_CODE')}, session=${payload.sessionId})`
    );
  }
}
