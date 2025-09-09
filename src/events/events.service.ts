import { Injectable } from '@nestjs/common';
import { EventRequest, EventResponse } from '../generated/src/proto/events';
import { Observable, Subject } from 'rxjs';
import { RpcException } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import { ApiKeyUsageService } from '../api-key/api-key-usage.service';
import { API_KEY_ID, OWNER_ID } from './events.constants';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { StreamEventBatcher } from './stream-event-batcher.service';
import { StreamWebSocketBatcher } from '../websocket/stream-websocket-batcher.service';
import { METRIC_AGGREGATION_QUEUE } from '../metrics/constants/metrics.constant';

@Injectable()
export class EventsService {
  constructor(
    private readonly apiKeyUsageService: ApiKeyUsageService,
    @InjectQueue(METRIC_AGGREGATION_QUEUE) private readonly metricsAggregationQueue: Queue,
    private readonly streamEventBatcher: StreamEventBatcher,
    private readonly streamWebSocketBatcher: StreamWebSocketBatcher,
  ) {}

  eventStream(requests: Observable<EventRequest>, metadata: Metadata): Observable<EventResponse> {
    const responseSubject = new Subject<EventResponse>();

    requests.subscribe({
      next: (event) => {
        const apiKeyId = metadata.get(API_KEY_ID)[0].toString();
        const ownerId = metadata.get(OWNER_ID)[0].toString();

        this.apiKeyUsageService.incrementUsage(apiKeyId);
        this.streamEventBatcher.addStreamEvent({ ownerId, ...event });
        this.streamWebSocketBatcher.addEvent(ownerId, event);
        this.metricsAggregationQueue.add('process-aggregation', { ownerId, event });

        responseSubject.next({
          status: 'received',
          message: 'ok',
        });
      },
      error: (error) => {
        console.error('Stream error:', error);
        responseSubject.error(new RpcException('Internal server error'));
      },
    });

    return responseSubject.asObservable();
  }
}
