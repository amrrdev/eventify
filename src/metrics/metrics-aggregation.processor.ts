import { Processor, WorkerHost } from '@nestjs/bullmq';
import { METRIC_AGGREGATION_QUEUE } from './constants/metrics.constant';
import { Job } from 'bullmq';
import { MetricsAggregationService } from './metrics-aggregation.service';

@Processor(METRIC_AGGREGATION_QUEUE)
export class MetricsAggregationProcessor extends WorkerHost {
  constructor(private readonly metricsAggregationService: MetricsAggregationService) {
    super();
  }

  async process(job: Job, token?: string): Promise<any> {
    const { ownerId, event } = job.data;
    try {
      await this.metricsAggregationService.processEvent(ownerId, event);
    } catch (error) {
      throw error;
    }
  }
}
