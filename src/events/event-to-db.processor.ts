import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EVENT_PROCESS_QUEUE } from '../events-http/events-http.constants';
import { EventsHttpService } from '../events-http/events-http.service';

@Processor(EVENT_PROCESS_QUEUE, { concurrency: 10 })
export class EventHttpProcessor extends WorkerHost {
  constructor(private readonly eventsHttpService: EventsHttpService) {
    super();
  }

  async process(job: Job, token?: string): Promise<any> {
    const { events } = job.data;
    const parsedEvents = events.map((event) => ({
      ...event,
      payload: JSON.parse(event.payload),
    }));
    try {
      await this.eventsHttpService.insertBatch(parsedEvents);
    } catch (error) {
      throw new Error(error.message);
    }
  }
}
