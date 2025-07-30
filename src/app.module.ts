import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IamModule } from './iam/iam.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import databaseConfig from './config/database.config';
import { RedisModule } from './integrations/redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ConfigModule.forFeature(databaseConfig),
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        return {
          uri: configService.get<string>('database.uri'),

          autoIndex: true,
          autoCreate: true,

          // Connection Pool Configuration
          maxPoolSize: 50,
          minPoolSize: 10,

          retryWrites: true,
          retryReads: true,

          // Read preference
          readPreference: 'primary',
        };
      },
      inject: [ConfigService],
    }),
    IamModule,
    UsersModule,
    RedisModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
