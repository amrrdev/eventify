export interface AnalyticsData {
  totalEvents: number;
  uniqueUsers: number;
  eventsPerUser: number;
  volumeData: Array<{ time: string; events: number }>;
  topEvents: Array<{ name: string; count: number }>;
  eventDistribution: Array<{ name: string; value: number; percentage: number }>;
}
