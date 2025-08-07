export interface AggregateddMetrics {
  timestamp: Date;
  totalEvents: number;
  eventsPerSecond: number;
  eventTypeBreakdown: Record<string, number>;
  errorRate: number;
  recentTrends: {
    last5min: number;
    last15min: number;
    last1hour: number;
  };
}
