import { Processor, WorkerHost } from '@nestjs/bullmq';
import { EventHttpProcessor } from '../events/event-to-db.processor';
import { Job } from 'bullmq';
import { EVENT_PROCESS_QUEUE } from '../events-http/events-http.constants';
import { EventWebSocketGateway } from './events-websocket.gateway';
import { WEBSOCKET_EVENTS_QUEUE } from './constants/websocket.constant';

@Processor(WEBSOCKET_EVENTS_QUEUE)
export class WebSocketEventProcessor extends WorkerHost {
  constructor(private readonly webSocketGatewat: EventWebSocketGateway) {
    super();
  }

  async process(job: Job<{ ownerId: string; events: any[] }>, token?: string): Promise<any> {
    const { ownerId, events } = job.data;
    try {
      const parsedEvents = events.map((event) => JSON.parse(event.payload));
      this.webSocketGatewat.broadcastToUser(ownerId, parsedEvents);
    } catch (error) {
      console.error(`Failed to broadcast events to user ${ownerId}:`, error);
      throw error;
    }
  }
}
