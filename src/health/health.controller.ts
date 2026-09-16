import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get('health')
  @ApiOperation({
    summary: 'Liveness probe',
    description:
      'Returns 200 while the process is alive. Used by Kubernetes livenessProbe and uptime monitors.',
  })
  checkLiveness() {
    return this.healthService.getLiveness();
  }

  @Public()
  @Get('ready')
  @ApiOperation({
    summary: 'Readiness probe',
    description:
      'Returns 200 only when the database connection is usable. Used by Kubernetes readinessProbe.',
  })
  checkReadiness() {
    return this.healthService.getReadiness();
  }
}
