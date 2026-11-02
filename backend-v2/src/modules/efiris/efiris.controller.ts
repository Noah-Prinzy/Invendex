import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ZodBody } from '../../common/decorators/zod-body.decorator';
import type { AuthUser } from '../../common/types/auth-user';
import { PERMISSIONS } from '../rbac/permissions';
import {
  SubmitInvoiceDtoClass,
  submitInvoiceSchema,
  type SubmitInvoiceDto
} from './dto/efiris.dto';
import { EfrisService } from './efiris.service';

@ApiTags('EFRIS (URA Uganda)')
@Controller('efiris')
export class EfrisController {
  constructor(private readonly efiris: EfrisService) {}

  @Post('invoices')
  @RequirePermission(PERMISSIONS.FINANCE_MANAGE)
  @ApiOperation({ summary: 'Submit an invoice to URA EFRIS (stub — implementation phase next)' })
  @ApiBody({ type: SubmitInvoiceDtoClass })
  submit(
    @ZodBody(submitInvoiceSchema) dto: SubmitInvoiceDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.efiris.submitInvoice(dto, String(user.organization ?? ''));
  }

  @Get('invoices/:fdn')
  @RequirePermission(PERMISSIONS.FINANCE_VIEW)
  @ApiOperation({ summary: 'Get EFRIS fiscal status for an FDN (stub)' })
  @ApiParam({ name: 'fdn', description: 'Fiscal Document Number returned by EFRIS' })
  status(@Param('fdn') fdn: string) {
    return this.efiris.getInvoiceStatus(fdn);
  }
}
