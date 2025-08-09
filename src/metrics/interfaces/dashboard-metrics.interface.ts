import { LiveEvent } from './live-events.interface';
import { PerformanceMetrics } from './performance-metrics.interface';

export interface MetricsDashboard {
  // KPI Cards
  totalEvents: number;
  totalEventsChange: number;
  activeUsers: number;
  activeUsersChange: number;
  eventsPerHour: number;
  eventsPerHourChange: number;
  conversionRate: number;
  conversionRateChange: number;

  // Charts Data
  eventVolumeData: Array<{ time: string; events: number }>;
  topEvents: Array<{ name: string; count: number }>;
  eventDistribution: Array<{ name: string; value: number; percentage: number }>;

  // Geographic & Device Data
  geographicDistribution: Array<{ country: string; count: number }>;
  deviceTypes: Array<{ device: string; count: number }>;
  topReferrers: Array<{ referrer: string; count: number }>;

  // Performance
  performanceMetrics: {
    avgResponseTime: number;
    processingRate: number;
    errorRate: number;
    uptime: number;
  };

  // Live Events
  liveEvents: LiveEvent[];
}
