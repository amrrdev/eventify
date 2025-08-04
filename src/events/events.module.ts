import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { EventInterceptor } from './interceptors/event.interceptor';
import { ApiKeyModule } from '../api-key/api-key.module';
import { BullModule } from '@nestjs/bullmq';
import { API_USAGE_TRACKER_QUEUE } from './events.constants';
import { ApiKeyUsageService } from '../api-key/api-key-usage.service';
import { ApiUsageTrackerProcessor } from './api-usage-tracker.processor';

@Module({
  imports: [
    ApiKeyModule,
    BullModule.registerQueue({
      name: API_USAGE_TRACKER_QUEUE,
    }),
  ],
  controllers: [EventsController],
  providers: [EventsService, EventInterceptor, ApiUsageTrackerProcessor],
})
export class EventsModule {}
