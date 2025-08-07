import { Injectable, Logger } from '@nestjs/common';
import { EventRequest, EventResponse } from '../generated/src/proto/events';
import { finalize, Observable, Subject } from 'rxjs';
import { RpcException } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import { ApiKeyUsageService } from '../api-key/api-key-usage.service';
import { API_KEY_ID, API_USAGE_TRACKER_QUEUE, OWNER_ID } from './events.constants';
import { ApiKeyStatus } from '../api-key/types/api-key.types';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { StreamEventBatcher } from './stream-event-batcher.service';
import { StreamWebSocketBatcher } from '../websocket/stream-websocket-batcher.service';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  constructor(
    private readonly apiKeyUsageService: ApiKeyUsageService,
    @InjectQueue(API_USAGE_TRACKER_QUEUE) private readonly apiKeyUsageQueue: Queue,
    private readonly streamEventBatcher: StreamEventBatcher,
    private readonly streamWebSocketBatcher: StreamWebSocketBatcher,
  ) {}
  latestUsageResult: Omit<ApiKeyStatus, 'active'> | null = null;

  eventStream(requests: Observable<EventRequest>, metadata: Metadata): Observable<EventResponse> {
    const responseSubject = new Subject<EventResponse>();

    const request$ = requests.pipe(
      finalize(() => {
        if (this.latestUsageResult) {
          this.apiKeyUsageQueue
            .add('save-usage', {
              key: this.latestUsageResult.key,
              usageCount: this.latestUsageResult.usageCount,
            })
            .then(() => responseSubject.complete())
            .catch((err) => console.error('Persist failed', err));
        } else {
          responseSubject.complete();
        }
      }),
    );

    const subscription = request$.subscribe({
      next: async (event) => {
        const apiKeyId = metadata.get(API_KEY_ID)[0].toString();
        const ownerId = metadata.get(OWNER_ID)[0].toString();

        const usageResult = await this.apiKeyUsageService.incrementUsage(apiKeyId);
        this.latestUsageResult = usageResult;
        if (usageResult.limitExceeded) {
          responseSubject.next({
            status: 'error',
            message: `Usage limit exceeded Current: ${usageResult.usageCount}/${usageResult.usageLimit}`,
          });

          subscription.unsubscribe();
          return;
        }
        this.streamEventBatcher.addStreamEvent({ ownerId, ...event });
        this.streamWebSocketBatcher.addEvent(ownerId, event);
        responseSubject.next({
          status: 'received',
          message: 'ok',
        });
      },

      complete: () => {
        console.log('Client stream completed');
      },

      error: (error) => {
        console.error('Stream error:', error);
        responseSubject.error(new RpcException('Internal server error'));
      },
    });

    return responseSubject.asObservable();
  }
}
