import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { EventInterceptor } from './interceptors/event.interceptor';
import { ApiKeyModule } from '../api-key/api-key.module';

@Module({
  imports: [ApiKeyModule],
  controllers: [EventsController],
  providers: [EventsService, EventInterceptor],
})
export class EventsModule {}
