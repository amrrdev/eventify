import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IamModule } from './iam/iam.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import databaseConfig from './config/database.config';
import { RedisModule } from './integrations/redis/redis.module';
import { NotificationService } from './integrations/notification/notification.service';
import { NotificationModule } from './integrations/notification/notification.module';
import { BullmqModule } from './integrations/bullmq/bullmq.module';
import { BullModule } from '@nestjs/bullmq';
import notificationConfig from './integrations/notification/config/notification.config';
import redisConfig from './integrations/redis/config/redis.config';
import bullmqConfig from './integrations/bullmq/config/bullmq.config';
import { ApiKeyModule } from './api-key/api-key.module';
import { EventsModule } from './events/events.module';
import { EventsHttpModule } from './events-http/events-http.module';
import { EventWebSocketModule } from './websocket/events-websocket.module';
import { MetricsAggregationModule } from './metrics/metrics-aggregation.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, notificationConfig, redisConfig, bullmqConfig],
    }),
    ConfigModule.forFeature(databaseConfig),
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        return {
          uri: configService.get<string>('database.uri'),

          autoIndex: true,
          autoCreate: true,

          // Connection Pool Configuration
          maxPoolSize: 100,
          minPoolSize: 10,

          // Read preference
          readPreference: 'primary',
          writeConcern: {
            w: 0,
          },
        };
      },
      inject: [ConfigService],
    }),
    IamModule,
    UsersModule,
    RedisModule,
    NotificationModule,
    BullmqModule,
    ApiKeyModule,
    EventsModule,
    EventsHttpModule,
    EventWebSocketModule,
    MetricsAggregationModule,
    CommonModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
