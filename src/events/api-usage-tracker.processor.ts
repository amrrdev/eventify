import { Processor, WorkerHost } from '@nestjs/bullmq';
import { API_USAGE_TRACKER_QUEUE } from './events.constants';
import { Job } from 'bullmq';
import { ApiKeyService } from '../api-key/api-key.service';

@Processor(API_USAGE_TRACKER_QUEUE)
export class ApiUsageTrackerProcessor extends WorkerHost {
  constructor(private readonly apiKeyService: ApiKeyService) {
    super();
  }

  async process(job: Job, token?: string): Promise<any> {
    const { key, usageCount } = job.data;
    return await this.apiKeyService.updateApiKeyUsage(key, usageCount);
  }
}
