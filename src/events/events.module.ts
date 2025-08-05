import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { EventInterceptor } from './interceptors/event.interceptor';
import { ApiKeyModule } from '../api-key/api-key.module';
import { BullModule } from '@nestjs/bullmq';
import { API_USAGE_TRACKER_QUEUE } from './events.constants';
import { ApiUsageTrackerProcessor } from './api-usage-tracker.processor';
import { EventsHttpModule } from '../events-http/events-http.module';
import { StreamEventBatcher } from './stream-event-batcher.service';
import { EventWebSocketModule } from '../websocket/events-websocket.module';

@Module({
  imports: [
    ApiKeyModule,
    EventsHttpModule,
    EventWebSocketModule,
    BullModule.registerQueue({
      name: API_USAGE_TRACKER_QUEUE,
    }),
  ],
  controllers: [EventsController],
  providers: [EventsService, EventInterceptor, ApiUsageTrackerProcessor, StreamEventBatcher],
})
export class EventsModule {}
