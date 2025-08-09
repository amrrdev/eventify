import { Body, Controller, Delete, Get, Param, Query } from '@nestjs/common';
import { EventsHttpService } from './events-http.service';
import { ActiveUser } from '../iam/decorators/active-user.decorator';
import { GetEventsDto } from './dtos/get-events.dto';
import { DeleteBatchEventsDto } from './dtos/delete-batch-events.dto';

@Controller('events')
export class EventsHttpController {
  constructor(private readonly eventHttpService: EventsHttpService) {}

  @Get()
  async getEvents(@ActiveUser('sub') sub: string, @Query() getEventsDto: GetEventsDto) {
    return this.eventHttpService.getEvents(sub, getEventsDto);
  }

  @Delete(':id')
  async deleteEvent(@Param('id') eventId: string, @ActiveUser('sub') sub: string) {
    return this.eventHttpService.deleteEvent(sub, eventId);
  }

  @Delete()
  async deletePatchEvents(@ActiveUser('sub') sub: string, @Body() deleteBatchEventsDto: DeleteBatchEventsDto) {
    return this.eventHttpService.deleteBatchEvents(sub, deleteBatchEventsDto);
  }
}
