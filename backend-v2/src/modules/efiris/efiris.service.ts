import { Injectable, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SubmitInvoiceDto } from './dto/efiris.dto';

/**
 * URA EFRIS e-invoicing (Uganda) — STUB, OpenAPI contract first.
 * Implementation phase will: sign/encrypt the invoice payload per EFRIS
 * spec, POST to {EFRIS_API_BASE_URL}, receive the FDN + verification code +
 * QR, and persist the fiscal document per tenant.
 */
@Injectable()
export class EfrisService {
  constructor(private readonly config: ConfigService) {}

  async submitInvoice(
    dto: SubmitInvoiceDto,
    organizationId: string
  ): Promise<never> {
    throw new NotImplementedException(
      `EFRIS invoice submission is stubbed (org=${organizationId}, invoice=${dto.invoiceNo}, ` +
        `base=${this.config.get<string>('EFRIS_API_BASE_URL')}). URA EFRIS client lands in the implementation phase.`
    );
  }

  async getInvoiceStatus(fdn: string): Promise<never> {
    throw new NotImplementedException(
      `EFRIS invoice status lookup is stubbed (fdn=${fdn}).`
    );
  }
}
