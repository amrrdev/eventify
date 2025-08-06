import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventDocument } from '../schemas/event.schema';
import { ICreateEvent } from '../interfaces/create-event.interface';
import mongoose from 'mongoose';

@Injectable()
export class EventHttpRepository {
  constructor(@InjectModel(Event.name) private readonly EventRepository: Model<EventDocument>) {}

  async deleteBatchEvents(ownerId: string, events: string[]) {
    try {
      const result = await this.EventRepository.deleteMany(
        { ownerId, _id: { $in: events } },
        { writeConcern: { w: 1 } },
      ).exec();

      if (result.deletedCount === 0) {
        throw new BadRequestException('No events matched the provided IDs for this user');
      }

      return result.deletedCount;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async deleteEvent(ownerId: string, eventId: string) {
    try {
      const deletetCount = (
        await this.EventRepository.deleteOne({ _id: eventId, ownerId }, { writeConcern: { w: 1 } }).exec()
      ).deletedCount;

      if (deletetCount === 0) {
        throw new BadRequestException('No events matched the provided IDs for this user');
      }

      return deletetCount;
    } catch (error) {
      throw error;
    }
  }

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

  async getEvents(ownerId: mongoose.Types.ObjectId | string, options?: { limit: number; skip: number }) {
    try {
      return this.EventRepository.find({ ownerId })
        .limit(options?.limit || 10)
        .skip(options?.skip || 0)
        .lean()
        .exec();
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
