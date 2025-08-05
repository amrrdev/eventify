import { Controller, Get, Query } from '@nestjs/common';
import { EventsHttpService } from './events-http.service';
import { ActiveUser } from '../iam/decorators/active-user.decorator';

@Controller('events')
export class EventsHttpController {
  constructor(private readonly eventHttpService: EventsHttpService) {}

  @Get()
  async getEvents(@ActiveUser('sub') sub: string, @Query() query?: { limit: number; skip: number }) {
    return this.eventHttpService.getEvents(sub, query);
  }
}
