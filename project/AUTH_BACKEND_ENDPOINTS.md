# Backend Authentication Endpoints (Eventify)

This document lists and explains all backend endpoints related to authentication in your NestJS API.

---

## 1. Sign Up

- **Endpoint:** `POST /api/v1/auth/sign-up`
- **Description:** Register a new user
- **Body:**
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "yourPassword"
  }
  ```
- **Response:**
  - 201: User created, needs email verification
  - 400/409: Validation or already exists

---

## 2. Login

- **Endpoint:** `POST /api/v1/auth/sign-in`
- **Description:** Authenticate user and get tokens
- **Body:**
  ```json
  {
    "email": "john@example.com",
    "password": "yourPassword"
  }
  ```
- **Response:**
  - 200: `{ accessToken, refreshToken }`
  - 401: Invalid credentials

---

## 3. Refresh Token

- **Endpoint:** `POST /api/v1/auth/refresh-token`
- **Description:** Get new access token using refresh token
- **Body:**
  ```json
  {
    "refreshToken": "<refresh_token>"
  }
  ```
- **Response:**
  - 200: `{ accessToken }`
  - 401: Invalid/expired token

---

## 4. Email Verification

- **Endpoint:** `POST /api/v1/auth/verify-email`
- **Description:** Verify user email with OTP
- **Body:**
  ```json
  {
    "email": "john@example.com",
    "otp": "123456"
  }
  ```
- **Response:**
  - 200: Success
  - 400: Invalid code

---

## 5. Resend OTP

- **Endpoint:** `POST /api/v1/auth/otp/resend`
- **Description:** Resend email verification OTP
- **Body:**
  ```json
  {
    "email": "john@example.com"
  }
  ```
- **Response:**
  - 200: OTP sent
  - 429: Too many requests

---

## 6. Get User Profile

- **Endpoint:** `GET /api/v1/users`
- **Description:** Get current user info (requires JWT)
- **Headers:**
  - `Authorization: Bearer <accessToken>`
- **Response:**
  - 200: User object
  - 401: Unauthorized

---

## 7. API Key Management

- **Create:** `POST /api/v1/api-key` (JWT required)
- **List:** `GET /api/v1/api-key` (JWT required)
- **Delete:** `DELETE /api/v1/api-key/:key` (JWT required)
- **Update:** `PATCH /api/v1/api-key/:key` (JWT required)
- **Validate:** `GET /api/v1/api-key/validate` (API key required)

---

## 8. Error Responses

- All endpoints return errors as:
  ```json
  {
    "error": "Bad Request",
    "message": "Invalid input data",
    "statusCode": 400
  }
  ```

---

## 9. Security

- All sensitive endpoints require JWT in `Authorization` header
- API key endpoints require valid API key or JWT
- Refresh token should be kept secure

---

## References

- See `src/iam/authentication/authentication.controller.ts` for implementation
- See `swagger.json` for full OpenAPI docs
