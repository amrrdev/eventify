import { Injectable } from '@nestjs/common';
import { ICreateEvent } from './interfaces/create-event.interface';
import { EventHttpRepository } from './repository/event-http.repository';
import mongoose from 'mongoose';
import { DeleteBatchEventsDto } from './dtos/delete-batch-events.dto';

@Injectable()
export class EventsHttpService {
  constructor(private readonly eventHttpRepository: EventHttpRepository) {}
  async insertEvent(creatEvent: ICreateEvent) {
    return await this.eventHttpRepository.insertEvent(creatEvent);
  }

  // TODO: Should seperate internal method to it's service
  // NOTE: this method for internal usgae
  async insertBatch(createEvents: (ICreateEvent & { receivedAt: number })[]) {
    return this.eventHttpRepository.insertBatch(createEvents);
  }

  async getEvents(ownerId: mongoose.Types.ObjectId | string, options?: { limit: number; skip: number }) {
    return await this.eventHttpRepository.getEvents(ownerId, options);
  }

  async deleteBatchEvents(owerId: string, deleteBatchEvents: DeleteBatchEventsDto) {
    const deletedCount = await this.eventHttpRepository.deleteBatchEvents(owerId, deleteBatchEvents.ids);
    return {
      status: 'success',
      message: 'deleted successfully',
      deletedCount,
    };
  }

  async deleteEvent(ownerId: string, eventId: string) {
    const deletedCount = await this.eventHttpRepository.deleteEvent(ownerId, eventId);
    return {
      status: 'success',
      message: 'deleted successfully',
      deletedCount,
    };
  }
}
