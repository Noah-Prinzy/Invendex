import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { ZodQuery } from '../../common/decorators/zod-query.decorator';
import { CurrencyService } from './currency.service';

const ratesQuerySchema = z
  .object({ base: z.string().length(3).default('UGX') })
  .strict();

const convertQuerySchema = z
  .object({
    amount: z.coerce.number(),
    from: z.string().length(3).default('UGX'),
    to: z.string().length(3)
  })
  .strict();

@ApiTags('Currency (multi-currency incl. UGX)')
@Controller('currency')
export class CurrencyController {
  constructor(private readonly currency: CurrencyService) {}

  @Get('currencies')
  @ApiOperation({ summary: 'List supported fiat currencies' })
  currencies() {
    return { data: { currencies: this.currency.supportedCurrencies() } };
  }

  @Get('rates')
  @ApiOperation({
    summary: 'Get exchange rates for a base currency (UGX default)'
  })
  @ApiQuery({ name: 'base', required: false, example: 'UGX' })
  rates(@ZodQuery(ratesQuerySchema) query: z.infer<typeof ratesQuerySchema>) {
    return this.currency
      .getRates(query.base)
      .then((result) => ({ data: result }));
  }

  @Get('convert')
  @ApiOperation({ summary: 'Convert an amount between currencies' })
  convert(
    @ZodQuery(convertQuerySchema) query: z.infer<typeof convertQuerySchema>
  ) {
    return this.currency
      .convert(query.amount, query.from, query.to)
      .then((result) => ({ data: result }));
  }
}
