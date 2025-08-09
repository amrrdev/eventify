# Frontend API Key Endpoints Documentation

This document describes all API key-related endpoints, expected request/response structures, and usage for the frontend, based on the actual backend controller/service/repo methods and DTOs.

---

## 1. List User API Keys

- **Endpoint:** `GET /api/v1/api-key`
- **Auth:** Requires JWT (user must be logged in)
- **Response:**
  ```json
  [
    {
      "key": "api_xxx...",
      "ownerId": "user_123",
      "active": true,
      "usageCount": 10,
      "usageLimit": 100
    }
  ]
  ```

---

## 2. Create API Key

- **Endpoint:** `POST /api/v1/api-key`
- **Auth:** Requires JWT
- **Request Body:**
  ```json
  {
    "name": "My App Key"
  }
  ```
- **Response:**
  ```json
  {
    "key": "api_xxx...",
    "ownerId": "user_123",
    "active": true,
    "usageCount": 0,
    "usageLimit": 100
  }
  ```

---

## 3. Validate API Key

- **Endpoint:** `GET /api/v1/api-key/validate`
- **Request Body:**
  ```json
  {
    "apiKey": "api_xxx..."
  }
  ```
- **Response:**
  ```json
  {
    "apiKey": {
      "key": "api_xxx...",
      "ownerId": "user_123",
      "active": true,
      "usageCount": 10,
      "usageLimit": 100
    }
  }
  ```

---

## 4. Delete API Key

- **Endpoint:** `DELETE /api/v1/api-key/:key`
- **Auth:** Requires JWT
- **Response:**
  ```json
  {
    "success": true
  }
  ```

---

## 5. Update API Key Activation

- **Endpoint:** `PATCH /api/v1/api-key/:key`
- **Auth:** Requires JWT
- **Request Body:**
  ```json
  {
    "isActive": true
  }
  ```
- **Response:**
  ```json
  {
    "key": "api_xxx...",
    "ownerId": "user_123",
    "active": true,
    "usageCount": 10,
    "usageLimit": 100
  }
  ```

---

## 6. Error Responses

- All endpoints return errors as:
  ```json
  {
    "error": "Bad Request",
    "message": "Invalid input data",
    "statusCode": 400
  }
  ```

---

## 7. TypeScript Interfaces

### ApiKeyStatus

```typescript
export type ApiKeyStatus = {
  key: string;
  ownerId: string;
  active: boolean;
  usageCount: number;
  usageLimit: number;
};
```

### ValidateApiKeyDto

```typescript
export class ValidateApiKeyDto {
  apiKey: string;
}
```

### UpdateApiKeyActivationDto

```typescript
export class UpdateApiKeyActivationDto {
  isActive: boolean;
}
```

---

## 8. Usage Notes

- API keys are used for authenticating requests from external apps/services.
- Never expose your API keys in public code or client-side code.
- Use JWT for user actions, API key for service-to-service calls.
- Usage limits and activation status are enforced by the backend.

---

## 9. References

- See `src/api-key/` for backend implementation
- See Swagger docs for full details
