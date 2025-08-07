import { Module } from '@nestjs/common';
import { EventsHttpService } from './events-http.service';
import { EventsHttpController } from './events-http.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Event, EventSchema } from './schemas/event.schema';
import { BullModule } from '@nestjs/bullmq';
import { EVENT_PROCESS_QUEUE } from './events-http.constants';
import { EventHttpRepository } from './repository/event-http.repository';
import { EventHttpProcessor } from '../events/event-to-db.processor';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Event.name, schema: EventSchema }]),
    BullModule.registerQueue({
      name: EVENT_PROCESS_QUEUE,
    }),
  ],
  controllers: [EventsHttpController],
  providers: [EventsHttpService, EventHttpRepository, EventHttpProcessor],
  exports: [EventsHttpService, BullModule, EventHttpProcessor],
})
export class EventsHttpModule {}
