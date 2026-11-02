import { Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Public } from '../../common/decorators/public.decorator';
import { ZodBody } from '../../common/decorators/zod-body.decorator';
import { ChannelsService } from './channels.service';

const whatsappMessageSchema = z
  .object({
    to: z.string().regex(/^\+?[1-9]\d{7,14}$/),
    body: z.string().min(1).max(4096),
    template: z.string().max(100).optional()
  })
  .strict();

const smsMessageSchema = z
  .object({
    to: z.string().regex(/^\+?[1-9]\d{7,14}$/),
    body: z.string().min(1).max(1600)
  })
  .strict();

const ussdSchema = z
  .object({
    sessionId: z.string().min(1).max(100),
    phoneNumber: z.string().regex(/^\+?[1-9]\d{7,14}$/),
    text: z.string().max(1024).default('')
  })
  .strict();

@ApiTags('Channels (WhatsApp / SMS / USSD)')
@Controller('channels')
export class ChannelsController {
  constructor(private readonly channels: ChannelsService) {}

  @Post('whatsapp/messages')
  @ApiOperation({ summary: 'Send a WhatsApp message (stub)' })
  sendWhatsApp(
    @ZodBody(whatsappMessageSchema) payload: { to: string; body: string }
  ) {
    return this.channels.sendWhatsApp(payload);
  }

  @Post('sms/send')
  @ApiOperation({ summary: 'Send an SMS (stub)' })
  sendSms(@ZodBody(smsMessageSchema) payload: { to: string; body: string }) {
    return this.channels.sendSms(payload);
  }

  @Public()
  @Post('ussd')
  @ApiOperation({ summary: 'USSD session callback (telco → Invendex)' })
  ussd(@ZodBody(ussdSchema) payload: z.infer<typeof ussdSchema>) {
    return this.channels.handleUssd(payload);
  }
}
