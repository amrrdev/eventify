import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { REDIS_CLIENT } from '../integrations/redis/redis.constants';
import * as Redis from 'ioredis';
import { MetricsDashboard } from './interfaces/dashboard-metrics.interface';
import { LiveEvent } from './interfaces/live-events.interface';
import { EventRequest, protobufPackage } from '../generated/src/proto/events';
import { EventWebSocketGateway } from '../websocket/events-websocket.gateway';

@Injectable()
export class MetricsAggregationService {
  private readonly liveEventsBuffer: LiveEvent[] = [];
  private metricsIntervalId: NodeJS.Timeout | null = null;
  private lastActivityTime: Date = new Date();
  private readonly INACTIVE_THRESHOLD_MINUTES = 2; // Show zeros after 2 minutes of inactivity
  private readonly ACTIVE_WINDOW_MINUTES = 5; // Rolling window for active metrics

  constructor(
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis.Redis,
    @Inject(forwardRef(() => EventWebSocketGateway)) private readonly websocketGateway: EventWebSocketGateway,
  ) {
    this.testRedisConnection();
    // Start the interval immediately for consistent broadcasting
    this.startMetricsAggregation();
  }

  private async testRedisConnection(): Promise<void> {
    try {
      await this.redisClient.ping();
    } catch (error) {
      console.error('❌ Redis connection failed for MetricsAggregationService:', error);
    }
  }

  async processEvent(userId: string, event: EventRequest): Promise<void> {
    // Update last activity time
    this.lastActivityTime = new Date();

    const now = new Date();
    const eventTime = new Date(event.timestamp);

    if (isNaN(eventTime.getTime())) {
      console.error(`❌ Invalid event timestamp received: "${event.timestamp}"`);
      return; // or handle with default: const eventTime = now;
    } // Use current time for consistency
    const timeKey = this.getTimeKey(now);
    const hourKey = this.getHourKey(now);
    const dayKey = this.getDayKey(now);

    // Parse payload for additional data
    let parsedPayload: any = {};
    try {
      parsedPayload = JSON.parse(event.payload);
    } catch (e) {
      console.warn('Failed to parse event payload:', e);
    }

    // Update activity timestamp in Redis
    await this.updateLastActivityTime(now);

    // Multi-level aggregation in Redis
    try {
      await Promise.all([
        this.updateVolumeMetrics(timeKey, hourKey, dayKey, event),
        this.updateUserMetrics(timeKey, event, parsedPayload),
        this.updateEventTypeMetrics(timeKey, event),
        this.updateGeographicMetrics(timeKey, event, parsedPayload),
        this.updateDeviceMetrics(timeKey, event, parsedPayload),
        this.updateReferrerMetrics(timeKey, event, parsedPayload),
        this.updatePerformanceMetrics(timeKey, event),
      ]);
    } catch (error) {
      console.error(`❌ Failed to update metrics:`, error);
    }

    // Add to live events buffer
    this.addToLiveEvents(event, parsedPayload);

    // Trigger immediate metric calculation
    await this.calculateAndBroadcastDashboardMetrics(userId);
  }

  private async updateLastActivityTime(timestamp: Date): Promise<void> {
    const activityKey = 'metrics:last_activity';
    await this.redisClient.setex(activityKey, 3600, timestamp.toISOString());
  }

  private async getLastActivityTime(): Promise<Date | null> {
    const activityKey = 'metrics:last_activity';
    const lastActivity = await this.redisClient.get(activityKey);
    return lastActivity ? new Date(lastActivity) : null;
  }

  private async isSystemActive(): Promise<boolean> {
    const lastActivity = await this.getLastActivityTime();
    if (!lastActivity) return false;

    const now = new Date();
    const inactiveMinutes = (now.getTime() - lastActivity.getTime()) / (1000 * 60);
    return inactiveMinutes <= this.INACTIVE_THRESHOLD_MINUTES;
  }

  private async updateVolumeMetrics(
    timeKey: string,
    hourKey: string,
    dayKey: string,
    event: EventRequest,
  ): Promise<void> {
    const pipe = this.redisClient.pipeline();

    // Minute-level (keep for active window + buffer)
    pipe.hincrby(`metrics:volume:${timeKey}`, 'total_events', 1);
    pipe.hincrby(`metrics:volume:${timeKey}`, event.eventName, 1);
    pipe.expire(`metrics:volume:${timeKey}`, (this.ACTIVE_WINDOW_MINUTES + 2) * 60);

    // Hour-level
    pipe.hincrby(`metrics:volume:hour:${hourKey}`, 'total_events', 1);
    pipe.hincrby(`metrics:volume:hour:${hourKey}`, event.eventName, 1);
    pipe.expire(`metrics:volume:hour:${hourKey}`, 3600);

    // Day-level
    pipe.hincrby(`metrics:volume:day:${dayKey}`, 'total_events', 1);
    pipe.expire(`metrics:volume:day:${dayKey}`, 86400);

    await pipe.exec();
  }

  private async updateUserMetrics(timeKey: string, event: EventRequest, payload: any): Promise<void> {
    const userId = payload.userId || 'anonymous';
    const sessionId = payload.sessionId;

    const pipe = this.redisClient.pipeline();

    // Track unique users with longer expiry during active window
    pipe.sadd(`metrics:users:${timeKey}`, userId);
    pipe.expire(`metrics:users:${timeKey}`, (this.ACTIVE_WINDOW_MINUTES + 2) * 60);

    // Track user sessions
    if (sessionId) {
      pipe.sadd(`metrics:sessions:${timeKey}`, sessionId);
      pipe.expire(`metrics:sessions:${timeKey}`, (this.ACTIVE_WINDOW_MINUTES + 2) * 60);
    }

    // Track conversion events
    if (['purchase', 'signup', 'subscribe'].includes(event.eventName)) {
      pipe.hincrby(`metrics:conversions:${timeKey}`, event.eventName, 1);
      pipe.expire(`metrics:conversions:${timeKey}`, (this.ACTIVE_WINDOW_MINUTES + 2) * 60);
    }

    await pipe.exec();
  }

  private async updateEventTypeMetrics(timeKey: string, event: EventRequest): Promise<void> {
    await this.redisClient.hincrby(`metrics:event_types:${timeKey}`, event.eventName, 1);
    await this.redisClient.expire(`metrics:event_types:${timeKey}`, (this.ACTIVE_WINDOW_MINUTES + 2) * 60);
  }

  private async updateGeographicMetrics(timeKey: string, _event: EventRequest, payload: any): Promise<void> {
    const country = payload.country || this.getCountryFromIP(payload.ip) || 'Unknown';
    await this.redisClient.hincrby(`metrics:countries:${timeKey}`, country, 1);
    await this.redisClient.expire(`metrics:countries:${timeKey}`, (this.ACTIVE_WINDOW_MINUTES + 2) * 60);
  }

  private async updateDeviceMetrics(timeKey: string, _event: EventRequest, payload: any): Promise<void> {
    const device = payload.device || 'unknown';
    await this.redisClient.hincrby(`metrics:devices:${timeKey}`, device, 1);
    await this.redisClient.expire(`metrics:devices:${timeKey}`, (this.ACTIVE_WINDOW_MINUTES + 2) * 60);
  }

  private async updateReferrerMetrics(timeKey: string, _event: EventRequest, payload: any): Promise<void> {
    const referrer = payload.referrer || 'Direct';
    await this.redisClient.hincrby(`metrics:referrers:${timeKey}`, referrer, 1);
    await this.redisClient.expire(`metrics:referrers:${timeKey}`, (this.ACTIVE_WINDOW_MINUTES + 2) * 60);
  }

  private async updatePerformanceMetrics(timeKey: string, event: EventRequest): Promise<void> {
    const processingTime = Date.now() - new Date(event.timestamp).getTime();
    await this.redisClient.lpush(`metrics:response_times:${timeKey}`, processingTime);
    await this.redisClient.ltrim(`metrics:response_times:${timeKey}`, 0, 99);
    await this.redisClient.expire(`metrics:response_times:${timeKey}`, 3600);
  }

  private addToLiveEvents(event: EventRequest, payload: any): void {
    const liveEvent: LiveEvent = {
      id: `${Date.now()}_${Math.random()}`,
      eventName: event.eventName,
      userId: payload.userId || 'anonymous',
      country: payload.country || 'US',
      device: payload.device || 'web',
      timestamp: new Date(event.timestamp),
      timeAgo: this.getTimeAgo(new Date(event.timestamp)),
    };

    // Add to buffer and keep only last 50
    this.liveEventsBuffer.unshift(liveEvent);
    if (this.liveEventsBuffer.length > 50) {
      this.liveEventsBuffer.pop();
    }
  }

  private async calculateAndBroadcastDashboardMetrics(userId?: string): Promise<void> {
    const metrics = await this.generateDashboardMetrics();
    if (userId) {
      this.websocketGateway.broadcastMetrics(userId, metrics);
    } else {
      // Broadcast to all connected users during interval updates
      this.websocketGateway.broadcastMetrics('all', metrics);
    }
  }

  private async generateDashboardMetrics(): Promise<MetricsDashboard> {
    const currentTime = new Date();

    // Check if system is active
    const isActive = await this.isSystemActive();

    if (!isActive) {
      console.log(
        `⏸️ System inactive for more than ${this.INACTIVE_THRESHOLD_MINUTES} minutes, showing minimal metrics`,
      );
      return this.generateInactiveMetrics();
    }

    // Get time-based data from active window
    const activeMetrics = await this.getActiveWindowMetrics(currentTime);
    const previousMetrics = await this.getPreviousWindowMetrics(currentTime);

    // Calculate changes
    const totalEventsChange = this.calculatePercentageChange(activeMetrics.totalEvents, previousMetrics.totalEvents);
    const activeUsersChange = this.calculatePercentageChange(activeMetrics.activeUsers, previousMetrics.activeUsers);

    // Generate other metrics
    const eventVolumeData = await this.generate24HourData();
    const topEvents = this.processTopEvents(activeMetrics.eventTypes);
    const eventDistribution = this.processEventDistribution(activeMetrics.eventTypes, activeMetrics.totalEvents);

    return {
      totalEvents: activeMetrics.totalEvents,
      totalEventsChange,
      activeUsers: activeMetrics.activeUsers,
      activeUsersChange,
      eventsPerHour: activeMetrics.totalEvents * 12, // 5-minute window * 12 = hour
      eventsPerHourChange: totalEventsChange,
      conversionRate: activeMetrics.conversionRate,
      conversionRateChange: 0, // Could implement comparison logic
      eventVolumeData,
      topEvents,
      eventDistribution,
      geographicDistribution: this.processGeographicData(activeMetrics.countries),
      deviceTypes: this.processDeviceData(activeMetrics.devices),
      topReferrers: this.processReferrerData(activeMetrics.referrers),
      performanceMetrics: {
        avgResponseTime: activeMetrics.avgResponseTime,
        processingRate: Math.max(activeMetrics.totalEvents * 12, 1), // events per hour
        errorRate: 0.02,
        uptime: 99.98,
      },
      liveEvents: [...this.liveEventsBuffer],
    };
  }

  private async getActiveWindowMetrics(currentTime: Date) {
    const volumeData: Record<string, string> = {};
    const eventTypes: Record<string, string> = {};
    const countries: Record<string, string> = {};
    const devices: Record<string, string> = {};
    const referrers: Record<string, string> = {};
    const conversions: Record<string, string> = {};
    const responseTimes: string[] = [];
    let uniqueUsers = new Set<string>();

    // Aggregate from active window (last 5 minutes)
    for (let i = 0; i < this.ACTIVE_WINDOW_MINUTES; i++) {
      const timePoint = new Date(currentTime.getTime() - i * 60 * 1000);
      const timeKey = this.getTimeKey(timePoint);

      const [volume, events, countries_data, devices_data, referrers_data, conversions_data, users, response_times] =
        await Promise.all([
          this.redisClient.hgetall(`metrics:volume:${timeKey}`),
          this.redisClient.hgetall(`metrics:event_types:${timeKey}`),
          this.redisClient.hgetall(`metrics:countries:${timeKey}`),
          this.redisClient.hgetall(`metrics:devices:${timeKey}`),
          this.redisClient.hgetall(`metrics:referrers:${timeKey}`),
          this.redisClient.hgetall(`metrics:conversions:${timeKey}`),
          this.redisClient.smembers(`metrics:users:${timeKey}`),
          this.redisClient.lrange(`metrics:response_times:${timeKey}`, 0, -1),
        ]);

      // Merge data
      this.mergeRedisDataInPlace(volumeData, volume);
      this.mergeRedisDataInPlace(eventTypes, events);
      this.mergeRedisDataInPlace(countries, countries_data);
      this.mergeRedisDataInPlace(devices, devices_data);
      this.mergeRedisDataInPlace(referrers, referrers_data);
      this.mergeRedisDataInPlace(conversions, conversions_data);

      // Collect unique users
      users.forEach((user) => uniqueUsers.add(user));
      responseTimes.push(...response_times);
    }

    const totalEvents = parseInt(volumeData.total_events || '0');
    const totalConversions = Object.values(conversions).reduce((sum, val) => sum + parseInt(val || '0'), 0);
    const conversionRate = totalEvents > 0 ? (totalConversions / totalEvents) * 100 : 0;
    const avgResponseTime = this.calculateAverageResponseTime(responseTimes);

    return {
      totalEvents,
      activeUsers: uniqueUsers.size,
      eventTypes,
      countries,
      devices,
      referrers,
      conversions,
      conversionRate,
      avgResponseTime,
    };
  }

  private async getPreviousWindowMetrics(currentTime: Date) {
    // Get metrics from previous 5-minute window
    const startOffset = this.ACTIVE_WINDOW_MINUTES * 60 * 1000; // 5 minutes ago
    const endOffset = startOffset + this.ACTIVE_WINDOW_MINUTES * 60 * 1000; // 10 minutes ago

    const volumeData: Record<string, string> = {};
    let uniqueUsers = new Set<string>();

    for (let i = 0; i < this.ACTIVE_WINDOW_MINUTES; i++) {
      const timePoint = new Date(currentTime.getTime() - startOffset - i * 60 * 1000);
      const timeKey = this.getTimeKey(timePoint);

      const [volume, users] = await Promise.all([
        this.redisClient.hgetall(`metrics:volume:${timeKey}`),
        this.redisClient.smembers(`metrics:users:${timeKey}`),
      ]);

      this.mergeRedisDataInPlace(volumeData, volume);
      users.forEach((user) => uniqueUsers.add(user));
    }

    return {
      totalEvents: parseInt(volumeData.total_events || '0'),
      activeUsers: uniqueUsers.size,
    };
  }

  private generateInactiveMetrics(): MetricsDashboard {
    // Return minimal/zero metrics when system is inactive
    return {
      totalEvents: 0,
      totalEventsChange: 0,
      activeUsers: 0,
      activeUsersChange: 0,
      eventsPerHour: 0,
      eventsPerHourChange: 0,
      conversionRate: 0,
      conversionRateChange: 0,
      eventVolumeData: Array.from({ length: 24 }, (_, i) => ({
        time: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
        events: 0,
      })),
      topEvents: [],
      eventDistribution: [],
      geographicDistribution: [],
      deviceTypes: [],
      topReferrers: [],
      performanceMetrics: {
        avgResponseTime: 0,
        processingRate: 0,
        errorRate: 0,
        uptime: 99.98,
      },
      liveEvents: [], // Clear live events during inactive state
    };
  }

  private mergeRedisDataInPlace(target: Record<string, string>, source: Record<string, string>): void {
    for (const [key, value] of Object.entries(source)) {
      if (target[key]) {
        target[key] = (parseInt(target[key]) + parseInt(value)).toString();
      } else {
        target[key] = value;
      }
    }
  }

  // Keep existing helper methods with minimal changes
  private async generate24HourData(): Promise<Array<{ time: string; events: number }>> {
    const data: Array<{ time: string; events: number }> = [];
    const now = new Date();

    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourKey = this.getHourKey(time);
      const hourData = await this.redisClient.hgetall(`metrics:volume:hour:${hourKey}`);

      data.push({
        time: time.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
        events: parseInt(hourData.total_events || '0'),
      });
    }

    return data;
  }

  private processTopEvents(eventTypes: Record<string, string>): Array<{ name: string; count: number }> {
    return Object.entries(eventTypes)
      .filter(([key]) => key !== 'total_events')
      .map(([name, count]) => ({ name, count: parseInt(count) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private processEventDistribution(
    eventTypes: Record<string, string>,
    total: number,
  ): Array<{ name: string; value: number; percentage: number }> {
    const distribution = Object.entries(eventTypes)
      .filter(([key]) => key !== 'total_events')
      .map(([name, count]) => {
        const value = parseInt(count);
        const percentage = total > 0 ? (value / total) * 100 : 0;
        return { name, value, percentage };
      })
      .sort((a, b) => b.value - a.value);

    return distribution;
  }

  private processGeographicData(countries: Record<string, string>): Array<{ country: string; count: number }> {
    return Object.entries(countries)
      .map(([country, count]) => ({ country, count: parseInt(count) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private processDeviceData(devices: Record<string, string>): Array<{ device: string; count: number }> {
    return Object.entries(devices)
      .map(([device, count]) => ({ device, count: parseInt(count) }))
      .sort((a, b) => b.count - a.count);
  }

  private processReferrerData(referrers: Record<string, string>): Array<{ referrer: string; count: number }> {
    return Object.entries(referrers)
      .map(([referrer, count]) => ({ referrer, count: parseInt(count) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private calculateAverageResponseTime(responseTimes: string[]): number {
    if (responseTimes.length === 0) return 0;
    const times = responseTimes.map((t) => parseInt(t));
    return Math.round(times.reduce((sum, time) => sum + time, 0) / times.length);
  }

  private calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100 * 100) / 100;
  }

  private updateLiveEventsTimeAgo(): void {
    this.liveEventsBuffer.forEach((event) => {
      event.timeAgo = this.getTimeAgo(event.timestamp);
    });
  }

  private getTimeAgo(date: Date): string {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  }

  private getTimeKey(timestamp: Date): string {
    return Math.floor(timestamp.getTime() / (1000 * 60)).toString();
  }

  private getHourKey(timestamp: Date): string {
    return Math.floor(timestamp.getTime() / (1000 * 60 * 60)).toString();
  }

  private getDayKey(timestamp: Date): string {
    return Math.floor(timestamp.getTime() / (1000 * 60 * 60 * 24)).toString();
  }

  private getCountryFromIP(_ip: string): string | null {
    const mockCountries = ['United States', 'United Kingdom', 'Canada', 'Germany', 'France'];
    return mockCountries[Math.floor(Math.random() * mockCountries.length)];
  }

  private startMetricsAggregation(): void {
    // Broadcast metrics every 10 seconds to all connected clients
    this.metricsIntervalId = setInterval(async () => {
      await this.calculateAndBroadcastDashboardMetrics();

      // Update live events time ago
      this.updateLiveEventsTimeAgo();
    }, 10000);
  }

  async testMetricsAggregation(userId: string): Promise<MetricsDashboard> {
    return await this.generateDashboardMetrics();
  }

  // Cleanup method
  onModuleDestroy(): void {
    if (this.metricsIntervalId) {
      clearInterval(this.metricsIntervalId);
      this.metricsIntervalId = null;
    }
  }
}
