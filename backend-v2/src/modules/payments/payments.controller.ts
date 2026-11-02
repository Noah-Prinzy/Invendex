import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ZodBody } from '../../common/decorators/zod-body.decorator';
import { PERMISSIONS } from '../rbac/permissions';
import {
  RequestToPayDtoClass,
  requestToPaySchema,
  type RequestToPayDto
} from './dto/payments.dto';
import { PaymentsService } from './payments.service';

const webhookPayloadSchema = z.record(z.string(), z.unknown());

@ApiTags('Payments — Mobile Money (MTN MoMo / Airtel)')
@Controller('payments/mobile-money')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('request-to-pay')
  @RequirePermission(PERMISSIONS.FINANCE_MANAGE)
  @ApiOperation({
    summary: 'Request a mobile-money payment (stub — provider wiring next)'
  })
  @ApiBody({ type: RequestToPayDtoClass })
  requestToPay(@ZodBody(requestToPaySchema) dto: RequestToPayDto) {
    return this.payments.requestToPay(dto);
  }

  @Public()
  @Post('webhook/:provider')
  @ApiOperation({
    summary: 'Provider webhook (MTN MoMo / Airtel / aggregator)'
  })
  @ApiParam({ name: 'provider', enum: ['aggregator', 'mtn', 'airtel'] })
  webhook(
    @Param('provider') _provider: string,
    @ZodBody(webhookPayloadSchema) payload: unknown
  ) {
    return this.payments.handleWebhook(payload);
  }

  @Get('transactions/:reference')
  @RequirePermission(PERMISSIONS.FINANCE_VIEW)
  @ApiOperation({ summary: 'Get mobile-money transaction status by reference' })
  transaction(@Param('reference') reference: string) {
    return this.payments.getTransactionStatus(reference);
  }
}
