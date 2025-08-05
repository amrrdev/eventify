import { Injectable } from '@nestjs/common';
import { ICreateEvent } from '../events-http/interfaces/create-event.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { EVENT_PROCESS_QUEUE } from '../events-http/events-http.constants';
import { Queue } from 'bullmq';

@Injectable()
export class StreamEventBatcher {
  private buffer: (ICreateEvent & { receivedAt: number })[];
  private batch: number;
  private flushInterval: number;
  private ownerId = '688b82ca87cb6c572cd9df0d';

  constructor(@InjectQueue(EVENT_PROCESS_QUEUE) private readonly eventProcessQueue: Queue) {
    this.buffer = [];
    this.batch = 10000;
    this.flushInterval = 500;

    setInterval(() => this.flushBatch(), this.flushInterval);
  }

  addStreamEvent(event: ICreateEvent) {
    this.buffer.push({
      ...event,
      ownerId: this.ownerId,
      payload: event.payload,
      receivedAt: Date.now(),
    });

    if (this.buffer.length >= this.batch) {
      this.flushBatch();
    }
  }

  async flushBatch() {
    if (this.buffer.length === 0) return;

    const batchs = [...this.buffer];
    this.buffer = [];

    await this.eventProcessQueue.add('event-processing', {
      events: batchs,
    });
  }
}
