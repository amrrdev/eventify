import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventDocument } from '../schemas/event.schema';
import { ICreateEvent } from '../interfaces/create-event.interface';

@Injectable()
export class EventHttpRepository {
  constructor(@InjectModel(Event.name) private readonly EventRepository: Model<EventDocument>) {}

  async insertEvent(creatEvent: ICreateEvent) {
    try {
      const event = new this.EventRepository(creatEvent);
      return event.save();
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async insertBatch(createEvents: (ICreateEvent & { receivedAt: number })[]) {
    try {
      const result = this.EventRepository.insertMany(createEvents, { ordered: false });
    } catch (error) {
      console.error(`❌ Batch failed:`, error);
      throw error; // Let BullMQ handle retries
    }
  }
}
