import { Injectable } from '@nestjs/common';
import { EventRequest, EventResponse } from '../generated/src/proto/events';
import { finalize, Observable, Subject } from 'rxjs';
import { RpcException } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import { ApiKeyUsageService } from '../api-key/api-key-usage.service';
import { API_KEY_ID } from './events.constants';
import { ApiKeyService } from '../api-key/api-key.service';
import { ApiKeyStatus } from '../api-key/types/api-key.types';

@Injectable()
export class EventsService {
  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly apiKeyUsageService: ApiKeyUsageService,
  ) {}
  latestUsageResult: Omit<ApiKeyStatus, 'active'> | null = null;

  eventStream(requests: Observable<EventRequest>, metadata: Metadata): Observable<EventResponse> {
    const responseSubject = new Subject<EventResponse>();

    const request$ = requests.pipe(
      finalize(() => {
        if (this.latestUsageResult) {
          this.apiKeyService
            .updateApiKeyUsage(this.latestUsageResult.key, this.latestUsageResult.usageCount)
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
