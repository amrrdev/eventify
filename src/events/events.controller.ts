import { Controller, Logger, UseInterceptors } from '@nestjs/common';
import { EventsService } from './events.service';
import { GrpcStreamMethod, RpcException } from '@nestjs/microservices';
import { Auth } from '../iam/authentication/decorators/auth.decorator';
import { AuthType } from '../iam/authentication/enum/auth-type.enum';
import { EventRequest, EventResponse } from '../generated/src/proto/events';
import { Observable, Subject } from 'rxjs';
import { EventInterceptor } from './interceptors/event.interceptor';

@Controller()
@Auth(AuthType.None)
export class EventsController {
  private readonly logger = new Logger(EventsController.name);
  constructor(private readonly eventsService: EventsService) {}

  @GrpcStreamMethod('EventsService', 'EventStream')
  @UseInterceptors(EventInterceptor)
  eventStream(requests: Observable<EventRequest>, metadata: any): Observable<EventResponse> {
    return this.eventsService.eventStream(requests, metadata);
  }
}
