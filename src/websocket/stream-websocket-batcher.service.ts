import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { WEBSOCKET_EVENTS_QUEUE } from './constants/websocket.constant';
import { Queue } from 'bullmq';

@Injectable()
export class StreamWebSocketBatcher {
  private bufferMap: Map<string, any[]> = new Map();
  private readonly batchSize = 5000;
  private readonly bufferInterval = 500;

  constructor(@InjectQueue(WEBSOCKET_EVENTS_QUEUE) private readonly websocketQueue: Queue) {
    setInterval(() => this.flushAllBatches(), this.bufferInterval);
  }

  async addEvent(ownerId: string, event: any) {
    if (!this.bufferMap.has(ownerId)) {
      this.bufferMap.set(ownerId, []);
    }

    const userBuffer = this.bufferMap.get(ownerId)!;
    userBuffer.push(event);

    if (userBuffer.length >= this.batchSize) {
      this.flushAllBatches();
    }
  }

  async flushUserBatch(ownerId: string) {
    const events = this.bufferMap.get(ownerId);
    if (!events || events.length === 0) return;
    this.bufferMap.set(ownerId, []);

    await this.websocketQueue.add('broadcast-events', {
      ownerId,
      events,
    });
  }

  async flushAllBatches() {
    for (const ownerId of this.bufferMap.keys()) {
      this.flushUserBatch(ownerId);
    }
  }
}
