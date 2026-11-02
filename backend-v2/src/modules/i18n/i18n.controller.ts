import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Public } from '../../common/decorators/public.decorator';
import { ZodQuery } from '../../common/decorators/zod-query.decorator';
import { I18nService } from './i18n.service';

const messagesQuerySchema = z
  .object({ locale: z.string().max(10).optional() })
  .strict();

@ApiTags('i18n')
@Controller('i18n')
export class I18nController {
  constructor(private readonly i18n: I18nService) {}

  @Public()
  @Get('locales')
  @ApiOperation({ summary: 'List supported locales (en/sw/fr/lg + expansion)' })
  locales() {
    return {
      data: {
        default: this.i18n.defaultLocale(),
        supported: this.i18n.supportedLocales()
      }
    };
  }

  @Public()
  @Get('messages')
  @ApiOperation({ summary: 'Get the message catalog for a locale' })
  @ApiQuery({ name: 'locale', required: false, example: 'sw' })
  messages(@ZodQuery(messagesQuerySchema) query: z.infer<typeof messagesQuerySchema>) {
    return { data: { locale: this.i18n.normalize(query.locale), messages: this.i18n.messages(query.locale) } };
  }
}
