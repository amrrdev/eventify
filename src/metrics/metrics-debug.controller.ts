import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { MetricsAggregationService } from './metrics-aggregation.service';
import { EventRequest } from '../generated/src/proto/events';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { METRIC_AGGREGATION_QUEUE } from './constants/metrics.constant';

@Controller('debug/metrics')
export class MetricsDebugController {
  constructor(private readonly metricsAggregationService: MetricsAggregationService) {}

  @Get('test/:userId')
  async testMetrics(@Param('userId') userId: string) {
    return await this.metricsAggregationService.testMetricsAggregation(userId);
  }

  @Post('simulate/:userId')
  async simulateEvent(@Param('userId') userId: string, @Body() eventData?: any) {
    const mockEvent: EventRequest = {
      eventName: eventData?.eventName || 'test_event',
      payload: JSON.stringify({
        userId: userId,
        sessionId: 'test-session-123',
        country: 'United States',
        device: 'web',
        referrer: 'google.com',
        ip: '192.168.1.1',
        ...eventData?.payload,
      }),
      timestamp: new Date().toISOString(),
      tags: ['test'],
      category: 'test',
      severity: 1,
    };

    await this.metricsAggregationService.processEvent(userId, mockEvent);

    return {
      message: 'Event simulated successfully',
      event: mockEvent,
    };
  }
}
