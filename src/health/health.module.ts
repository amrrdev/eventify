import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '../integrations/redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
