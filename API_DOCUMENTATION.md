# Eventify API Documentation

## Overview

Eventify is a real-time event tracking and analytics platform that provides:

- **REST API** for authentication, user management, and event retrieval
- **gRPC Streaming** for high-performance event ingestion
- **WebSocket** for real-time dashboard updates and live metrics
- **Redis-based metrics aggregation** with 5-minute data retention
- **Real-time analytics dashboard** with comprehensive KPIs

## API Documentation

The complete API documentation is available in the `swagger.json` file. You can use it with any Swagger/OpenAPI compatible tool.

### Quick Start

1. **View API Documentation:**

   ```bash
   # Using Swagger UI
   npx swagger-ui-serve swagger.json

   # Or import into Postman/Insomnia
   ```

2. **Authentication:**
   - Register: `POST /auth/sign-up`
   - Login: `POST /auth/sign-in`
   - Use the returned JWT token in Authorization header: `Bearer <token>`

3. **Create API Key:**
   ```bash
   POST /api-key
   {
     "name": "My API Key"
   }
   ```

## gRPC Event Streaming

### Service Definition

```protobuf
service EventsService {
  rpc EventStream(stream EventRequest) returns (stream EventResponse);
}

message EventRequest {
  string eventName = 1;
  string payload = 2;          // JSON string
  string timestamp = 3;        // ISO 8601 format
  repeated string tags = 4;
  optional string category = 5;
  optional Severity severity = 6;
}

message EventResponse {
  string status = 1;
  string message = 2;
}
```

### Client Example (Node.js)

```javascript
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

// Load proto file
const packageDefinition = protoLoader.loadSync('events.proto');
const eventsProto = grpc.loadPackageDefinition(packageDefinition).events;

// Create client
const client = new eventsProto.EventsService('localhost:50051', grpc.credentials.createInsecure());

// Stream events
const call = client.EventStream();

call.on('data', (response) => {
  console.log('Response:', response);
});

// Send events
call.write({
  eventName: 'page_view',
  payload: JSON.stringify({ userId: 'user123', page: '/home' }),
  timestamp: new Date().toISOString(),
  tags: ['frontend'],
  category: 'navigation',
  severity: 1,
});
```

## WebSocket Real-time Updates

### Connection

```javascript
const io = require('socket.io-client');

const socket = io('http://localhost:3000', {
  transports: ['websocket', 'polling'],
  query: {
    token: 'your-jwt-token', // Pass JWT token
  },
});

// Or use Authorization header
const socket = io('http://localhost:3000', {
  extraHeaders: {
    Authorization: 'Bearer your-jwt-token',
  },
});
```

### Event Listeners

```javascript
// Connection events
socket.on('connect', () => {
  console.log('Connected to WebSocket');
});

socket.on('disconnect', () => {
  console.log('Disconnected from WebSocket');
});

socket.on('error', (error) => {
  console.error('WebSocket error:', error);
});

// Data events
socket.on('dashboard_data', (metrics) => {
  console.log('Dashboard metrics:', metrics);
  // Update your dashboard UI
});

socket.on('events', (events) => {
  console.log('Live events:', events);
  // Update live events feed
});
```

### Dashboard Data Structure

```typescript
interface MetricsDashboard {
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

  // Performance Metrics
  performanceMetrics: {
    avgResponseTime: number;
    processingRate: number;
    errorRate: number;
    uptime: number;
  };

  // Live Events
  liveEvents: LiveEvent[];
}
```

## Authentication & Authorization

### JWT Token Structure

```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "iat": 1691491800,
  "exp": 1691495400,
  "iss": "eventify",
  "aud": "eventify-client"
}
```

### API Key Format

- Prefix: `ak_`
- Length: 32 characters
- Example: `ak_1234567890abcdef1234567890abcdef`

## Rate Limiting & Quotas

- **REST API**: 1000 requests/minute per user
- **gRPC Streaming**: 10,000 events/minute per API key
- **WebSocket**: 1 connection per user
- **Data Retention**: 5 minutes for real-time metrics, 24 hours for historical data

## Error Handling

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `429` - Too Many Requests
- `500` - Internal Server Error

### Error Response Format

```json
{
  "error": "Bad Request",
  "message": "Invalid input data",
  "statusCode": 400,
  "timestamp": "2024-08-08T10:30:00Z",
  "path": "/api/endpoint"
}
```

### gRPC Status Codes

- `OK` - Success
- `INVALID_ARGUMENT` - Invalid request data
- `UNAUTHENTICATED` - Invalid API key
- `PERMISSION_DENIED` - Insufficient permissions
- `RESOURCE_EXHAUSTED` - Rate limit exceeded
- `INTERNAL` - Server error

## Environment Configuration

### Required Environment Variables

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/eventify

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_ISSUER=eventify
JWT_AUDIENCE=eventify-client
JWT_ACCESS_TOKEN_TTL=3600
JWT_REFRESH_TOKEN_TTL=86400

# gRPC
GRPC_PORT=50051

# HTTP
HTTP_PORT=3000

# Email (for OTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Docker Setup

```yaml
version: '3.8'
services:
  eventify:
    build: .
    ports:
      - '3000:3000'
      - '50051:50051'
    environment:
      - MONGODB_URI=mongodb://mongo:27017/eventify
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongo
      - redis

  mongo:
    image: mongo:latest
    ports:
      - '27017:27017'

  redis:
    image: redis:latest
    ports:
      - '6379:6379'
```

## Testing

### Using the Debug Endpoints

```bash
# Test metrics aggregation
GET /debug/metrics/test/{userId}

# Simulate events for testing
POST /debug/metrics/simulate/{userId}
{
  "eventName": "test_event",
  "payload": {
    "custom": "data"
  }
}
```

### Event Simulation with cURL

```bash
curl -X POST "http://localhost:3000/debug/metrics/simulate/user123" \
  -H "Content-Type: application/json" \
  -d '{
    "eventName": "button_click",
    "payload": {
      "buttonId": "submit-btn",
      "page": "/checkout"
    }
  }'
```

## Support

For questions or issues:

- Email: support@eventify.com
- Documentation: https://docs.eventify.com
- GitHub Issues: https://github.com/amrrdev/eventify/issues
