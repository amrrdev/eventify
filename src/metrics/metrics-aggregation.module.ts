import { Module, forwardRef } from '@nestjs/common';
import { RedisModule } from '../integrations/redis/redis.module';
import { MetricsAggregationService } from './metrics-aggregation.service';
import { EventWebSocketModule } from '../websocket/events-websocket.module';
import { MetricsAggregationProcessor } from './metrics-aggregation.processor';
import { BullModule } from '@nestjs/bullmq';
import { METRIC_AGGREGATION_QUEUE } from './constants/metrics.constant';
import { MetricsDebugController } from './metrics-debug.controller';

@Module({
  imports: [
    RedisModule,
    forwardRef(() => EventWebSocketModule),
    BullModule.registerQueue({
      name: METRIC_AGGREGATION_QUEUE,
    }),
  ],
  controllers: [MetricsDebugController],
  providers: [MetricsAggregationService, MetricsAggregationProcessor],
  exports: [MetricsAggregationService, MetricsAggregationProcessor, BullModule],
})
export class MetricsAggregationModule {}
