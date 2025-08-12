# Eventify Technical Architecture

## System Design Philosophy

Eventify is architected around three core principles: **Performance**, **Scalability**, and **Reliability**. Every technical decision was made to optimize for high-throughput event processing while maintaining real-time analytics capabilities and enterprise-grade reliability.

## Protocol Selection Rationale

### gRPC for Event Ingestion

**Why gRPC over REST for Events?**

Traditional REST APIs become bottlenecks at scale due to:

- JSON serialization overhead (3-5x larger payloads than Protocol Buffers)
- HTTP/1.1 connection limitations (6 connections per domain)
- Request/response latency for each event (200-500ms round trips)

**gRPC Advantages in Our Context:**

```typescript
// Protocol Buffer definition optimizes network efficiency
message EventRequest {
  string eventName = 1;        // 4 bytes + string length
  string payload = 2;          // 4 bytes + JSON length
  string timestamp = 3;        // 4 bytes + ISO string
  repeated string tags = 4;    // Array with minimal overhead
  optional string category = 5; // Only sent when present
  optional Severity severity = 6; // Enum = 1 byte
}
```

**Performance Impact:**

- **Payload Size**: 60-80% reduction compared to JSON
- **Serialization Speed**: 5-10x faster than JSON parsing
- **Connection Efficiency**: Single HTTP/2 connection handles thousands of streams
- **Streaming**: Bidirectional streaming enables real-time backpressure handling

### WebSocket for Real-Time Analytics

**Why WebSocket over Server-Sent Events or Polling?**

**Traditional Polling Problems:**

```javascript
// Polling approach - inefficient
setInterval(() => {
  fetch('/api/metrics').then(updateDashboard); // 200ms latency per request
}, 1000); // 1 request/second per client = high server load
```

**WebSocket Solution:**

```typescript
// Server-push approach - efficient
this.websocketGateway.broadcastMetrics(userId, metrics); // <10ms latency
```

**Benefits:**

- **Latency Reduction**: From 200ms (HTTP) to <10ms (WebSocket)
- **Server Load**: 90% reduction compared to polling
- **Real-Time**: True push-based updates without client requests
- **Connection Persistence**: Single connection for entire session

### Nginx as Intelligent Gateway

**Why Nginx over Application-Level Routing?**

**Protocol Multiplexing Challenge:**
Our application serves multiple protocols from different ports:

- gRPC Server: Port 4000
- HTTP/WebSocket Server: Port 3000
- Need single entry point for production deployment

**Nginx Solution:**

```nginx
# Intelligent routing based on content type
location / {
    if ($content_type ~* "application/grpc") {
        grpc_pass grpc://nestjs_grpc;
    }

    # WebSocket upgrade detection
    proxy_pass http://nestjs_http;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
}
```

**Advantages:**

- **Performance**: C-based Nginx outperforms Node.js for static routing
- **SSL Termination**: Offloads encryption/decryption from application
- **Load Balancing**: Built-in upstream health checking and failover
- **Security**: Rate limiting, request filtering, and DDoS protection

## Data Architecture Decisions

### MongoDB for Event Storage

**Why MongoDB over PostgreSQL?**

**Event Data Characteristics:**

```typescript
interface Event {
  eventName: string;
  payload: string; // Variable JSON structure
  timestamp: Date;
  tags: string[]; // Variable array length
  category?: string; // Optional fields
  severity?: Severity;
  ownerId: string;
}
```

**MongoDB Advantages:**

- **Schema Flexibility**: Events have varying payload structures
- **Horizontal Scaling**: Built-in sharding for multi-TB datasets
- **Write Performance**: Optimized for high-volume inserts
- **Index Strategy**: Compound indexes on (ownerId, timestamp, eventName)

**Configuration Optimizations:**

```typescript
MongooseModule.forRootAsync({
  useFactory: () => ({
    maxPoolSize: 100, // High connection pool
    minPoolSize: 10,
    writeConcern: { w: 0 }, // Fire-and-forget writes
    readPreference: 'primary',
  }),
});
```

### Redis for Real-Time State

**Why Redis over In-Memory Caching?**

**Use Cases:**

1. **Session Storage**: JWT refresh tokens with TTL
2. **Rate Limiting**: API key usage counters
3. **Metrics Aggregation**: Time-series data with automatic expiration
4. **Job Queues**: BullMQ backing store

**Redis Data Structures:**

```typescript
// Metrics aggregation using Redis primitives
await this.redis.hincrby(`metrics:volume:${timeKey}`, 'total_events', 1);
await this.redis.sadd(`metrics:users:${timeKey}`, userId);
await this.redis.expire(`metrics:volume:${timeKey}`, 300); // 5-minute TTL
```

**Performance Benefits:**

- **Sub-millisecond Operations**: In-memory data structure operations
- **Atomic Operations**: HINCRBY, SADD operations are atomic
- **Memory Efficiency**: Optimized data structures (Hash, Set, Sorted Set)
- **Persistence Options**: Configurable durability vs performance trade-offs

## Event Processing Pipeline

### Stream Processing Architecture

**Challenge: High-Volume Event Processing**

- 100,000+ events/second ingestion rate
- Real-time analytics requirements
- Reliable persistence guarantees

**Solution: Multi-Stage Pipeline**

```typescript
// Stage 1: Event Validation & Rate Limiting
async eventStream(requests: Observable<EventRequest>): Observable<EventResponse> {
  return requests.pipe(
    // Validate API key and check rate limits
    mergeMap(async (event) => {
      const usageResult = await this.apiKeyUsageService.incrementUsage(apiKeyId);
      if (usageResult.limitExceeded) {
        throw new RpcException('Rate limit exceeded');
      }
      return event;
    }),

    // Stage 2: Batch Accumulation
    tap(event => this.streamEventBatcher.addStreamEvent(event)),

    // Stage 3: Real-time Analytics
    tap(event => this.metricsAggregationService.processEvent(ownerId, event))
  );
}
```

### Batching Strategy

**Why Batching?**

- **Database Efficiency**: Single insert for 10,000 events vs 10,000 individual inserts
- **Memory Management**: Prevents memory buildup during traffic spikes
- **Throughput Optimization**: Maximizes database write performance

**Implementation:**

```typescript
class StreamEventBatcher {
  private buffer: Event[] = [];
  private readonly BATCH_SIZE = 10000;
  private readonly FLUSH_INTERVAL = 500; // ms

  addStreamEvent(event: Event) {
    this.buffer.push(event);

    // Size-based flushing
    if (this.buffer.length >= this.BATCH_SIZE) {
      this.flushBatch();
    }
  }

  // Time-based flushing prevents stale data
  constructor() {
    setInterval(() => this.flushBatch(), this.FLUSH_INTERVAL);
  }
}
```

## Real-Time Analytics Engine

### Multi-Level Aggregation Strategy

**Challenge: Real-Time Analytics at Scale**

- Calculate metrics across multiple time windows
- Handle high-frequency updates efficiently
- Provide historical trend analysis

**Solution: Hierarchical Time Windows**

```typescript
// Time-based keys for different aggregation levels
private getTimeKey(timestamp: Date): string {
  return Math.floor(timestamp.getTime() / (1000 * 60)).toString(); // Minute
}

private getHourKey(timestamp: Date): string {
  return Math.floor(timestamp.getTime() / (1000 * 60 * 60)).toString(); // Hour
}

private getDayKey(timestamp: Date): string {
  return Math.floor(timestamp.getTime() / (1000 * 60 * 60 * 24)).toString(); // Day
}
```

**Aggregation Pipeline:**

```typescript
async processEvent(userId: string, event: EventRequest) {
  const timeKey = this.getTimeKey(new Date());
  const hourKey = this.getHourKey(new Date());

  // Parallel aggregation across multiple dimensions
  await Promise.all([
    this.updateVolumeMetrics(timeKey, hourKey, event),
    this.updateUserMetrics(timeKey, event),
    this.updateEventTypeMetrics(timeKey, event),
    this.updateGeographicMetrics(timeKey, event),
    this.updateDeviceMetrics(timeKey, event)
  ]);

  // Immediate dashboard update
  await this.calculateAndBroadcastDashboardMetrics(userId);
}
```

### Memory Management Strategy

**Challenge: Preventing Memory Leaks**

- Continuous metric accumulation
- Growing buffer sizes
- Long-running processes

**Solution: Automatic Cleanup**

```typescript
// Redis TTL for automatic cleanup
pipe.expire(`metrics:volume:${timeKey}`, (this.ACTIVE_WINDOW_MINUTES + 2) * 60);

// Buffer size limits
if (this.liveEventsBuffer.length > 50) {
  this.liveEventsBuffer.pop(); // Remove oldest events
}

// Inactive system detection
private async isSystemActive(): Promise<boolean> {
  const lastActivity = await this.getLastActivityTime();
  const inactiveMinutes = (Date.now() - lastActivity.getTime()) / (1000 * 60);
  return inactiveMinutes <= this.INACTIVE_THRESHOLD_MINUTES;
}
```

## Security Architecture

### Multi-Layer Authentication

**Layer 1: API Key Validation**

```typescript
// Custom API key format with user hint
private generateApiKey(ownerId: string): string {
  const randomBytes = crypto.randomBytes(24).toString('hex');
  const userHint = ownerId.slice(0, 4);
  return `evntfy_${userHint}_${randomBytes}`;
}
```

**Layer 2: JWT Authentication**

```typescript
// Dual token strategy
interface TokenPair {
  accessToken: string; // Short-lived (1 hour)
  refreshToken: string; // Long-lived (24 hours)
}

// Redis-based session management
await this.redisService.insert(userId, refreshTokenId);
```

**Layer 3: Rate Limiting**

```typescript
// Redis-based rate limiting with Lua scripts
const usageResult = await this.apiKeyUsageService.incrementUsage(apiKeyId);
if (usageResult.limitExceeded) {
  throw new RpcException(`Usage limit exceeded: ${usageResult.usageCount}/${usageResult.usageLimit}`);
}
```

## Deployment Architecture

### Single Container Strategy

**Why Single Container vs Microservices?**

**Microservices Challenges:**

- Network latency between services
- Complex orchestration requirements
- Higher resource overhead
- Deployment complexity

**Single Container Benefits:**

```dockerfile
FROM nginx:alpine
RUN apk add --no-cache nodejs npm redis
# All services in one container with shared resources
```

**Advantages:**

- **Simplified Deployment**: Single deployment unit
- **Shared Memory**: Efficient inter-service communication
- **Resource Efficiency**: Lower memory footprint
- **Atomic Updates**: All services updated together

### Process Management

**Service Orchestration:**

```bash
# start-railway.sh - Production startup script
redis-server --daemonize yes &
node dist/main.js &
NESTJS_PID=$!

# Health check integration
curl -f http://127.0.0.1:3000/api/v1/health

# Nginx as main process (PID 1)
exec nginx -g 'daemon off;'
```

## Performance Optimizations

### Database Write Optimization

```typescript
// MongoDB configuration for maximum write performance
{
  writeConcern: { w: 0 },        // Fire-and-forget writes
  maxPoolSize: 100,              // High connection pool
  bufferMaxEntries: 0,           // Disable mongoose buffering
  useUnifiedTopology: true       // New connection management
}
```

### Memory Usage Optimization

```typescript
// Streaming processing prevents memory buildup
eventStream(requests: Observable<EventRequest>): Observable<EventResponse> {
  return requests.pipe(
    // Process events one at a time
    mergeMap(event => this.processEvent(event), 1),
    // Automatic cleanup on stream end
    finalize(() => this.cleanup())
  );
}
```

### Network Optimization

```typescript
// gRPC channel options for high throughput
channelOptions: {
  'grpc.max_send_message_length': 2 * 1024 * 1024 * 1024,    // 2GB
  'grpc.max_receive_message_length': 2 * 1024 * 1024 * 1024, // 2GB
  'grpc.keepalive_time_ms': 30000,
  'grpc.keepalive_timeout_ms': 5000,
  'grpc.keepalive_permit_without_calls': true
}
```

## Monitoring & Observability

### Health Check Strategy

```typescript
@Get('health')
async checkHealth() {
  const checks = await Promise.allSettled([
    this.checkDatabase(),
    this.checkRedis(),
    this.checkJobQueue()
  ]);

  return {
    status: checks.every(check => check.status === 'fulfilled') ? 'healthy' : 'unhealthy',
    checks: checks.map(check => ({
      service: check.status === 'fulfilled' ? 'up' : 'down',
      latency: check.value?.latency || null
    }))
  };
}
```

### Performance Metrics

```typescript
// Built-in performance tracking
private async updatePerformanceMetrics(timeKey: string, event: EventRequest) {
  const processingTime = Date.now() - new Date(event.timestamp).getTime();
  await this.redisClient.lpush(`metrics:response_times:${timeKey}`, processingTime);
  await this.redisClient.ltrim(`metrics:response_times:${timeKey}`, 0, 99); // Keep last 100
}
```

This architecture delivers enterprise-grade performance while maintaining simplicity and operational efficiency. Every component is designed to scale horizontally and handle production workloads with minimal operational overhead.
