import { Controller, Get } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';

/**
 * Versioned health endpoint: GET /api/v1/health.
 * Root-level /health, /health/live, /health/ready and /metrics are registered
 * directly on the HTTP adapter in main.ts (same as the legacy app).
 */
@Controller('health')
export class ApiHealthController {
  @Public()
  @Get()
  @ApiExcludeEndpoint()
  apiHealth() {
    return { success: true, message: 'API is healthy', status: 'ok' };
  }
}
