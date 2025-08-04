import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { RpcException } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import { ApiKeyService } from '../../api-key/api-key.service';
import { randomUUID } from 'node:crypto';
import { API_KEY_ID, CLIENT_ID } from '../events.constants';
import { ApiKeyUsageService } from '../../api-key/api-key-usage.service';

@Injectable()
export class EventInterceptor implements NestInterceptor {
  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly apiKeyUsageService: ApiKeyUsageService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler<any>): Promise<Observable<any>> {
    const metadata = context.switchToRpc().getContext<Metadata>();
    const apiKey = this.extractApiKeyFromHeader(metadata);

    if (!apiKey) {
      throw new RpcException('Please Provide Api Key to use our system');
    }

    try {
      const validApiKey = await this.apiKeyService.validateApiKey({ apiKey: apiKey.toString() });

      const apiKeyId = randomUUID();
      metadata.set(API_KEY_ID, apiKeyId);

      await this.apiKeyUsageService.initializeApiKeyUsage(apiKeyId, validApiKey);

      return next.handle();
    } catch (error) {
      throw new RpcException(error.message);
    }
  }

  private extractApiKeyFromHeader(metadata: Metadata) {
    return metadata.get('x-api-key')[0];
  }
}
