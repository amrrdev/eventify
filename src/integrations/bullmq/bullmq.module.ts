import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import bullmqConfig from './config/bullmq.config';

@Module({
  imports: [
    ConfigModule.forFeature(bullmqConfig),
    BullModule.forRootAsync({
      useFactory: (bullmqConfigrations: ConfigType<typeof bullmqConfig>) => {
        return {
          connection: {
            host: bullmqConfigrations.host,
            port: bullmqConfigrations.port,
            maxRetriesPerRequest: null,
          },
        };
      },
      inject: [bullmqConfig.KEY],
    }),
  ],
})
export class BullmqModule {}
