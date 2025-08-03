import { Module } from '@nestjs/common';
import { REDIS_CLIENT } from './redis.constants';
import { ConfigModule, ConfigType } from '@nestjs/config';
import redisConfig from './config/redis.config';
import Redis from 'ioredis';
import { RedisService } from './redis.service';

@Module({
  imports: [ConfigModule.forFeature(redisConfig)],
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (redisConfigrations: ConfigType<typeof redisConfig>) => {
        return new Redis({
          port: redisConfigrations.port,
          host: redisConfigrations.host,
          // password: redisConfigrations.password, // TODO: uncomment in production
          maxRetriesPerRequest: null,
        });
      },

      inject: [redisConfig.KEY],
    },
    RedisService,
  ],
  exports: [RedisService, REDIS_CLIENT],
})
export class RedisModule {}
