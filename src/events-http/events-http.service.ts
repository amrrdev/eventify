import { BadRequestException, Injectable } from '@nestjs/common';
import { ICreateEvent } from './interfaces/create-event.interface';
import { EventHttpRepository } from './repository/event-http.repository';
import mongoose from 'mongoose';
import { DeleteBatchEventsDto } from './dtos/delete-batch-events.dto';
import { GetEventsDto } from './dtos/get-events.dto';

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

  async getEvents(ownerId: mongoose.Types.ObjectId | string, query: GetEventsDto) {
    const filter: any = { ownerId };

    if (query.eventName) filter.eventName = query.eventName;
    if (query.category) filter.category = query.category;
    if (query.severity) filter.severity = query.severity;
    if (query.tags?.length) filter.tags = { $in: query.tags };

    if (query.fromDate || query.toDate) {
      const from = query.fromDate ? new Date(query.fromDate) : undefined;
      const to = query.toDate ? new Date(query.toDate) : undefined;
      if (from && to && from > to) {
        throw new BadRequestException('fromDate must be before or equal to toDate');
      }
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = from;
      if (to) filter.timestamp.$lte = to;
    }

    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const sortField = query.sortBy || 'timestamp';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortField]: sortOrder } as any;

    const { items, total } = await this.eventHttpRepository.getEventsWithFilter({
      filter,
      limit,
      skip,
      sort,
    });

    return {
      events: items,
      page,
      limit,
      total,
      totalPages: total ? Math.ceil(total / limit) : 0,
      filtersApplied: {
        eventName: query.eventName || null,
        category: query.category || null,
        severity: query.severity || null,
        tags: query.tags || [],
        fromDate: query.fromDate || null,
        toDate: query.toDate || null,
        sortBy: sortField,
        sortOrder: query.sortOrder || 'desc',
      },
    };
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
