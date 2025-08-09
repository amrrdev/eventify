# Events HTTP Module – Frontend Integration

Base Path: `/api/v1/events`
Auth: All endpoints require `Authorization: Bearer <accessToken>`

---

## 1. GET /api/v1/events

Fetch paginated & filtered events.

### Query Parameters

| Name      | Type       | Default   | Notes                                          |
| --------- | ---------- | --------- | ---------------------------------------------- | --------- | --------- | -------- |
| page      | number     | 1         | Page number (1-based)                          |
| limit     | number     | 50        | Max 200                                        |
| eventName | string     | -         | Exact match                                    |
| category  | string     | -         | Exact match                                    |
| severity  | string     | -         | One of INFO, WARN, ERROR, SEVERITY_UNSPECIFIED |
| fromDate  | ISO string | -         | Inclusive lower bound (timestamp field)        |
| toDate    | ISO string | -         | Inclusive upper bound (timestamp field)        |
| tags      | string[]   | -         | Accepts tags=a,b OR multiple tags= values      |
| sortBy    | string     | timestamp | timestamp                                      | createdAt | eventName | severity |
| sortOrder | string     | desc      | asc or desc                                    |

### Example Request

`GET /api/v1/events?page=1&limit=25&severity=ERROR&tags=auth,login&fromDate=2025-08-01T00:00:00Z&toDate=2025-08-09T23:59:59Z`

### Success Response (200)

```json
{
  "events": [
    {
      "_id": "66b6d...",
      "ownerId": "user_123",
      "eventName": "login",
      "payload": { "ip": "1.1.1.1" },
      "category": "auth",
      "tags": ["auth", "login"],
      "severity": "INFO",
      "timestamp": "2025-08-09T14:10:00.123Z",
      "createdAt": "2025-08-09T14:10:00.456Z",
      "updatedAt": "2025-08-09T14:10:00.456Z"
    }
  ],
  "page": 1,
  "limit": 25,
  "total": 3421,
  "totalPages": 137,
  "filtersApplied": {
    "eventName": null,
    "category": null,
    "severity": "ERROR",
    "tags": ["auth", "login"],
    "fromDate": "2025-08-01T00:00:00Z",
    "toDate": "2025-08-09T23:59:59Z",
    "sortBy": "timestamp",
    "sortOrder": "desc"
  }
}
```

### Error Responses

```json
{ "statusCode": 400, "message": "fromDate must be before or equal to toDate", "error": "Bad Request" }
{ "statusCode": 401, "message": "Unauthorized" }
```

### Frontend Tips

- Debounce filters before calling API (300–500ms)
- Reset page when filters change
- Use virtualized list for large sets

---

## 2. DELETE /api/v1/events/:id

Delete a single event.

### Success (200)

```json
{ "status": "success", "message": "deleted successfully", "deletedCount": 1 }
```

### Errors

```json
{ "statusCode": 404, "message": "No events matched the provided IDs for this user" }
```

---

## 3. DELETE /api/v1/events (Batch)

Delete multiple events in one request.

### Body

```json
{ "ids": ["66b6d1...", "66b6d2..."] }
```

### Success (200)

```json
{ "status": "success", "message": "deleted successfully", "deletedCount": 2 }
```

### Errors

```json
{ "statusCode": 400, "message": "No events matched the provided IDs for this user" }
```

---

## Event Item Shape

```ts
interface EventItem {
  _id: string;
  ownerId: string;
  eventName: string;
  payload: Record<string, any>;
  category?: string;
  tags?: string[];
  severity: 'SEVERITY_UNSPECIFIED' | 'INFO' | 'WARN' | 'ERROR';
  timestamp?: string; // may be null if not provided
  createdAt: string;
  updatedAt: string;
}
```

---

## Query Builder Utility (Frontend)

```ts
function buildEventQuery(params: Record<string, any>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) return;
    if (Array.isArray(v)) v.forEach((val) => sp.append(k, String(val)));
    else sp.set(k, String(v));
  });
  return sp.toString();
}
```

---

## Usage Workflow

1. User loads events page -> call GET with default page/limit.
2. User applies filters -> rebuild query, reset page to 1, refetch.
3. User selects rows -> enable single/batch delete.
4. After delete -> remove rows locally; if mismatch, refetch current page.

---

## Testing Checklist

- Pagination boundaries (page 1, last page)
- Date range validation (from > to => 400)
- Tag parsing: `tags=a,b` and `tags=a&tags=b`
- Sorting asc/desc for timestamp
- Batch delete with mix of valid/invalid IDs

---

## References

- DTO: `src/events-http/dtos/get-events.dto.ts`
- Service: `src/events-http/events-http.service.ts`
- Repository: `src/events-http/repository/event-http.repository.ts`
