import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EventWebSocketGateway } from './events-websocket.gateway';
import { WEBSOCKET_EVENTS_QUEUE } from './constants/websocket.constant';
import { EventRequest } from '../generated/src/proto/events';

@Processor(WEBSOCKET_EVENTS_QUEUE)
export class WebSocketEventProcessor extends WorkerHost {
  private eventCount: Record<string, number> = {};
  constructor(private readonly webSocketGateway: EventWebSocketGateway) {
    super();
  }

  async process(job: Job<{ ownerId: string; events: any[] }>, token?: string): Promise<any> {
    const { ownerId, events } = job.data;
    try {
      events.forEach((event) => (event.payload = JSON.parse(event.payload)));
      // const aggregatedEvents = this.aggregateEvents(events);

      this.webSocketGateway.broadcastToUser(ownerId, events);
    } catch (error) {
      console.error(`Failed to broadcast events to user ${ownerId}:`, error);
      throw error;
    }
  }

  aggregateEvents(events: EventRequest[]) {
    events.forEach((event) => {
      this.eventCount[event.eventName] = (this.eventCount[event.eventName] || 0) + 1;
    });
    return this.eventCount;
  }
}
