import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { Auth } from '../iam/authentication/decorators/auth.decorator';
import { AuthType } from '../iam/authentication/enum/auth-type.enum';

@Controller('health')
@Auth(AuthType.None)
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async checkHealth() {
    return await this.healthService.checkHealth();
  }

  @Get('simple')
  simpleHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'eventify',
      version: '1.0.0',
    };
  }
}
