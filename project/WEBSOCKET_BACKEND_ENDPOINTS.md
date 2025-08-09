# Backend WebSocket Endpoints & Dashboard Responses (Eventify)

This document explains the backend WebSocket endpoints for metrics, the structure of responses sent to the dashboard, and the TypeScript interfaces used for metrics data.

---

## 1. WebSocket Endpoint

- **URL:** `ws://<API_HOST>/ws/metrics` (or as configured)
- **Protocol:** Socket.IO (JSON messages)
- **Authentication:** JWT token required
  - The token must be provided as either:
    - A query parameter: `ws://<API_HOST>/ws/metrics?token=<JWT>`
    - Or in the `Authorization` header as `Bearer <JWT>` during the handshake
  - Connections without a valid token will be rejected.

---

## 2. Events Sent to Dashboard

### a. Metrics Dashboard Update

- **Event Name:** `dashboard_data`
- **Description:** Sent periodically (e.g., every 5s) with full dashboard metrics
- **Payload Example:**

```json
{
  "totalEvents": 12345,
  "totalEventsChange": 2.5,
  "activeUsers": 120,
  "activeUsersChange": -1.2,
  "eventsPerHour": 300,
  "eventsPerHourChange": 0.8,
  "conversionRate": 12.5,
  "conversionRateChange": 0.3,
  "eventVolumeData": [
    { "time": "2025-08-09T10:00:00Z", "events": 50 },
    { "time": "2025-08-09T11:00:00Z", "events": 60 }
  ],
  "topEvents": [
    { "name": "login", "count": 500 },
    { "name": "purchase", "count": 120 }
  ],
  "eventDistribution": [
    { "name": "login", "value": 500, "percentage": 40 },
    { "name": "purchase", "value": 120, "percentage": 10 }
  ],
  "geographicDistribution": [
    { "country": "US", "count": 80 },
    { "country": "EG", "count": 40 }
  ],
  "deviceTypes": [
    { "device": "mobile", "count": 90 },
    { "device": "web", "count": 30 }
  ],
  "topReferrers": [
    { "referrer": "google.com", "count": 60 },
    { "referrer": "twitter.com", "count": 20 }
  ],
  "performanceMetrics": {
    "avgResponseTime": 120,
    "processingRate": 99.5,
    "errorRate": 0.2,
    "uptime": 99.99
  },
  "liveEvents": [
    {
      "id": "evt_123",
      "eventName": "login",
      "userId": "user_1",
      "country": "US",
      "device": "mobile",
      "timestamp": "2025-08-09T11:05:00Z",
      "timeAgo": "2s ago"
    }
  ]
}
```

---

## 3. TypeScript Interfaces (Metrics)

### LiveEvent

```typescript
export interface LiveEvent {
  id: string;
  eventName: string;
  userId: string;
  country: string;
  device: 'mobile' | 'web' | 'tablet';
  timestamp: Date;
  timeAgo: string;
}
```

### MetricsDashboard

```typescript
export interface MetricsDashboard {
  totalEvents: number;
  totalEventsChange: number;
  activeUsers: number;
  activeUsersChange: number;
  eventsPerHour: number;
  eventsPerHourChange: number;
  conversionRate: number;
  conversionRateChange: number;
  eventVolumeData: Array<{ time: string; events: number }>;
  topEvents: Array<{ name: string; count: number }>;
  eventDistribution: Array<{ name: string; value: number; percentage: number }>;
  geographicDistribution: Array<{ country: string; count: number }>;
  deviceTypes: Array<{ device: string; count: number }>;
  topReferrers: Array<{ referrer: string; count: number }>;
  performanceMetrics: {
    avgResponseTime: number;
    processingRate: number;
    errorRate: number;
    uptime: number;
  };
  liveEvents: LiveEvent[];
}
```

### PerformanceMetrics

```typescript
export interface PerformanceMetrics {
  avgResponseTime: number;
  processingRate: number;
  errorRate: number;
  uptime: number;
}
```

### AnalyticsData

```typescript
export interface AnalyticsData {
  totalEvents: number;
  uniqueUsers: number;
  eventsPerUser: number;
  volumeData: Array<{ time: string; events: number }>;
  topEvents: Array<{ name: string; count: number }>;
  eventDistribution: Array<{ name: string; value: number; percentage: number }>;
}
```

---

## 4. How Dashboard Receives Data

- The dashboard receives periodic `dashboard_data` events with the full metrics payload (see above).
- It also receives real-time `events` notifications for new events (array of event objects).
- All payloads match the TypeScript interfaces above.
- Data is sent as JSON via Socket.IO.

---

## 5. References

- See `src/metrics/interfaces/` for all TypeScript interfaces
- See `src/integrations/bullmq/` and `src/integrations/notification/` for event processing
- See `src/metrics/` for metrics aggregation and WebSocket logic
