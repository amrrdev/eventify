import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../integrations/redis/redis.service';
import { Inject } from '@nestjs/common';
import { REDIS_CLIENT } from '../integrations/redis/redis.constants';
import * as Redis from 'ioredis';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis.Redis) {}

  async checkHealth(): Promise<any> {
    const healthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: await this.checkDatabase(),
        redis: await this.checkRedis(),
        system: this.checkSystem(),
      },
    };

    // Check if any service is down
    const hasError = Object.values(healthStatus.services).some((service) => service.status === 'error');

    if (hasError) {
      healthStatus.status = 'error';
    }

    return healthStatus;
  }

  private async checkDatabase(): Promise<any> {
    try {
      // In a real implementation, you would check the actual database connection
      // For now, we'll just return a mock response
      return {
        status: 'ok',
        message: 'Database connection is healthy',
      };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return {
        status: 'error',
        message: 'Database connection failed',
        error: error.message,
      };
    }
  }

  private async checkRedis(): Promise<any> {
    try {
      // Check Redis connection
      await this.redisClient.ping();
      return {
        status: 'ok',
        message: 'Redis connection is healthy',
      };
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return {
        status: 'error',
        message: 'Redis connection failed',
        error: error.message,
      };
    }
  }

  private checkSystem(): any {
    try {
      // Check system resources
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();

      return {
        status: 'ok',
        message: 'System resources are healthy',
        details: {
          memory: {
            rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
          },
          uptime: Math.round(uptime) + ' seconds',
        },
      };
    } catch (error) {
      this.logger.error('System health check failed', error);
      return {
        status: 'error',
        message: 'System check failed',
        error: error.message,
      };
    }
  }
}
