import { Injectable } from '@nestjs/common';
import { EventRequest, EventResponse } from '../generated/src/proto/events';
import { finalize, Observable, Subject } from 'rxjs';
import { RpcException } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import { ApiKeyUsageService } from '../api-key/api-key-usage.service';
import { API_KEY_ID, API_USAGE_TRACKER_QUEUE } from './events.constants';
import { ApiKeyService } from '../api-key/api-key.service';
import { ApiKeyStatus } from '../api-key/types/api-key.types';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EVENT_PROCESS_QUEUE } from '../events-http/events-http.constants';
import { StreamEventBatcher } from './stream-event-batcher.service';

@Injectable()
export class EventsService {
  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly apiKeyUsageService: ApiKeyUsageService,
    @InjectQueue(API_USAGE_TRACKER_QUEUE) private readonly apiKeyUsageQueue: Queue,
    @InjectQueue(EVENT_PROCESS_QUEUE) private readonly eventHttoQueue: Queue,
    private readonly streamEventBatcher: StreamEventBatcher,
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
        // ! ! ! Race condition dedicated
        const usageResult = await this.apiKeyUsageService.incrementUsage(apiKeyId);
        console.log(usageResult.usageCount);
        this.latestUsageResult = usageResult;

        if (usageResult.limitExceeded) {
          responseSubject.next({
            status: 'error',
            message: `Usage limit exceeded Current: ${usageResult.usageCount}/${usageResult.usageLimit}`,
          });

          subscription.unsubscribe();
          return;
        }

        try {
          const ownerId = '688b82ca87cb6c572cd9df0d';
          this.streamEventBatcher.addStreamEvent({ ownerId, ...event });
        } catch (error) {
          console.log(error);
        }

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
