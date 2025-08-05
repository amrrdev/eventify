import { Injectable } from '@nestjs/common';
import { ICreateEvent } from './interfaces/create-event.interface';
import { EventHttpRepository } from './repository/event-http.repository';

@Injectable()
export class EventsHttpService {
  constructor(private readonly eventHttpRepository: EventHttpRepository) {}
  async insertEvent(creatEvent: ICreateEvent) {
    return await this.eventHttpRepository.insertEvent(creatEvent);
  }

  async insertBatch(createEvents: (ICreateEvent & { receivedAt: number })[]) {
    return this.eventHttpRepository.insertBatch(createEvents);
  }
}
