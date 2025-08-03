import { Injectable } from '@nestjs/common';
import { EventRequest, EventResponse } from '../generated/src/proto/events';
import { Observable, Subject } from 'rxjs';
import { RpcException } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import { ApiKeyUsageService } from '../api-key/api-key-usage.service';
import { API_KEY_ID } from './events.constants';

@Injectable()
export class EventsService {
  constructor(private readonly apiKeyUsageService: ApiKeyUsageService) {}

  eventStream(requests: Observable<EventRequest>, metadata: Metadata): Observable<EventResponse> {
    const responseSubject = new Subject<EventResponse>();
    requests.subscribe({
      next: async (event) => {
        const apiKeyId = metadata.get(API_KEY_ID)[0].toString();
        const usageResult = await this.apiKeyUsageService.incrementUsage(apiKeyId);

        if (usageResult.limitExceeded) {
          responseSubject.next({
            status: 'error',
            message: `Usage limit exceeded Current: ${usageResult.usageCount}/${usageResult.usageLimit}`,
          });
          return;
        }

        responseSubject.next({
          status: 'received',
          message: 'ok',
        });
      },
      complete: () => {
        console.log('Client stream completed');
        responseSubject.complete();
      },
      error: (error) => {
        console.error('Stream error:', error);
        responseSubject.error(new RpcException('Internal server error'));
      },
    });

    return responseSubject.asObservable();
  }
}
