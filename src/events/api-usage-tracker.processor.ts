import { Processor, WorkerHost } from '@nestjs/bullmq';
import { API_USAGE_TRACKER_QUEUE } from './events.constants';
import { Job } from 'bullmq';
import { ApiKeyService } from '../api-key/api-key.service';
import { EventRequest } from '../generated/src/proto/events';
import { Observable } from 'rxjs';
import { RpcException } from '@nestjs/microservices';

@Processor(API_USAGE_TRACKER_QUEUE)
export class ApiUsageTrackerProcessor extends WorkerHost {
  constructor(private readonly apiKeyService: ApiKeyService) {
    super();
  }

  async process(job: Job, token?: string): Promise<any> {
    const { key, usageCount, usageLimit } = job.data;
    if (usageCount >= usageLimit) {
      throw new RpcException('');
    } else {
      return await this.apiKeyService.updateApiKeyUsage(key, usageCount);
    }
  }
}
