# API Contract Specification

Complete specification of all API endpoints tested, including request/response formats, authentication, and error handling.

## Base URL

```
https://apiv2-{ENV}.salary-hero.com/api
```

Where `{ENV}` = `dev`, `staging`, or `prod`

## Authentication

### Admin Login (Bearer Token)

**Endpoint:** `POST /v1/public/account/admin/login`

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Status Codes:**
- `200` - Login successful
- `401` - Invalid credentials
- `400` - Missing email or password

**Usage:**
All subsequent employee API calls require: `Authorization: Bearer {accessToken}`

---

## Employee API Endpoints

### 1. Create Employee

**Endpoint:** `POST /v1/admin/account/employee/{companyId}`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "information": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "0912345678",
    "national_id": "1234567890123",
    "passport_no": "AB123456",
    "birthday_at": "1990-01-15",
    "status": "active",
    "is_blacklist": false,
    "salary": 30000,
    "salary_type": "monthly",
    "employee_id": "EMP001",
    "company_id": "128",
    "paycycle_id": 3661,
    "disbursement_type": "bank",
    "line_id": null,
    "site_ids": []
  },
  "address": {
    "street_address": "123 Main St",
    "sub_district": "Watthana",
    "district": "Bangkok",
    "province": "Bangkok",
    "postcode": "10110"
  },
  "bank": {
    "bank_code": "014",
    "account_name": "John Doe",
    "account_no": "1234567890"
  }
}
```

**Response (201 Created):**
```json
{
  "information": {
    "user_id": 1262839,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "0912345678",
    "national_id": "1234567890123",
    "passport_no": "AB123456",
    "birthday_at": "1990-01-15",
    "status": "active",
    "is_blacklist": false,
    "salary": 30000,
    "salary_type": "monthly",
    "employee_id": "EMP001",
    "company_id": "128",
    "paycycle_id": 3661,
    "disbursement_type": "bank",
    "line_id": null,
    "site_ids": [],
    "created_at": "2026-04-21T08:30:00Z",
    "updated_at": "2026-04-21T08:30:00Z"
  },
  "address": {
    "user_address_id": "addr_xyz",
    "street_address": "123 Main St",
    "sub_district": "Watthana",
    "district": "Bangkok",
    "province": "Bangkok",
    "postcode": "10110",
    "created_at": "2026-04-21T08:30:00Z",
    "updated_at": "2026-04-21T08:30:00Z"
  },
  "bank": {
    "user_bank_id": "bank_xyz",
    "user_id": 1262839,
    "bank_code": "014",
    "account_name": "John Doe",
    "account_no": "1234567890",
    "account_verify": "pending",
    "created_at": "2026-04-21T08:30:00Z",
    "updated_at": "2026-04-21T08:30:00Z"
  }
}
```

**Status Codes:**
- `201` - Employee created successfully
- `400` - Invalid data (missing required fields, invalid format)
- `403` - Permission denied
- `409` - Duplicate employee_id or unique constraint violation

**Read-Only Fields (returned but not settable):**
- `user_id`
- `created_at`
- `updated_at`
- `user_address_id`
- `user_bank_id`
- `account_verify`

---

### 2. Get Employee (via Create Response)

**Note:** This project validates employees via the response from CREATE endpoint and database queries, not a dedicated GET endpoint.

**Database Verification:**
```sql
SELECT * FROM users WHERE user_id = ?;
SELECT * FROM employment WHERE legacy_user_id = ?;
```

---

### 3. Update Employee

**Endpoint:** `PATCH /v1/admin/account/employee/{companyId}/{userId}`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body (Writable Fields Only):**
```json
{
  "information": {
    "first_name": "Jonathan",
    "middle_name": "Michael",
    "last_name": "Doe",
    "email": "jonathan@example.com",
    "phone": "0987654321",
    "national_id": "1234567890123",
    "passport_no": "AB123456",
    "birthday_at": "1990-01-15",
    "salary": 35000,
    "salary_type": "monthly",
    "employee_id": "EMP001",
    "company_id": "128",
    "paycycle_id": 3661,
    "disbursement_type": "bank",
    "status": "active",
    "is_blacklist": false
  },
  "address": {
    "street_address": "456 Oak Ave",
    "sub_district": "Watthana",
    "district": "Bangkok",
    "province": "Bangkok",
    "postcode": "10110"
  },
  "bank": {
    "bank_code": "014",
    "account_name": "Jonathan Doe",
    "account_no": "0987654321"
  }
}
```

**Response (200 OK):**
Same structure as Create response with updated values.

**Status Codes:**
- `200` - Update successful
- `400` - Invalid data
- `403` - Permission denied (e.g., sending read-only fields)
- `404` - Employee not found
- `409` - Unique constraint violation

**Important:** Do NOT send read-only fields (user_id, created_at, updated_at, etc.) - will return 403

**Writable Fields (15 total):**
1. `first_name`
2. `middle_name`
3. `last_name`
4. `email`
5. `phone`
6. `national_id`
7. `passport_no`
8. `birthday_at`
9. `salary`
10. `salary_type`
11. `employee_id`
12. `company_id`
13. `paycycle_id`
14. `disbursement_type`
15. `status` / `is_blacklist`

**Type Conversions:**
- `paycycle_id`: API returns as string, must send as number
- `salary`: Must be a number
- `company_id`: Must be a string

---

### 4. Delete Employee

**Endpoint:** `DELETE /v1/admin/account/employee/{userId}`

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:** None

**Response (200 OK):**
```json
{
  "message": "Employee deleted successfully"
}
```

**Status Codes:**
- `200` - Employee deleted successfully
- `404` - Employee not found
- `403` - Permission denied

**Cascading Deletes:**
Backend automatically cascades deletes to:
- `employment` table (by legacy_user_id)
- `user_identity` table (by legacy_user_id)
- `user_balance` table (by user_id)
- `users` table (by user_id)

---

## Signup API Endpoints

### Phone Signup Flow

#### 1. Request OTP

**Endpoint:** `POST /v1/public/signup/phone/otp/request`

**Request:**
```json
{
  "phone": "0912345678"
}
```

**Response (200):**
```json
{
  "is_signup": false,
  "next_state": "signup.phone.verify",
  "verification_info": {
    "ref_code": "REF_ABC123XYZ"
  }
}
```

#### 2. Verify OTP

**Endpoint:** `POST /v1/public/signup/phone/otp/verify`

**Query Parameters:**
```
?verification_method=otp&action=verify&thaiId=0&otpSendType=sms
```

**Request:**
```json
{
  "phone": "0912345678",
  "ref_code": "REF_ABC123XYZ",
  "code": "123456"
}
```

**Response (200):**
```json
{
  "is_signup": true,
  "next_state": "user.profile",
  "verification_info": {
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### LINE Signup Flow

#### 1. LINE Signup

**Endpoint:** `POST /v1/public/signup/line`

**Request:**
```json
{
  "channel_id": "1234567890",
  "access_token": "{LINE_ACCESS_TOKEN}",
  "fcm_token": ""
}
```

**Response (200):**
```json
{
  "is_signup": false,
  "verification_info": {
    "auth_challenge": "CHALLENGE_ABC123"
  }
}
```

#### 2. Add Phone & Request OTP

**Endpoint:** `POST /v1/public/signup/line/phone`

**Query Parameters:**
```
?verification_method=otp&action=request
```

**Request:**
```json
{
  "phone": "0912345678",
  "auth_challenge": "CHALLENGE_ABC123"
}
```

**Response (200):**
```json
{
  "verification": {
    "ref_code": "REF_XYZ789"
  }
}
```

#### 3. Verify OTP

**Endpoint:** `POST /v1/public/signup/line/phone`

**Query Parameters:**
```
?verification_method=otp&action=verify
```

**Request:**
```json
{
  "phone": "0912345678",
  "auth_challenge": "CHALLENGE_ABC123",
  "fcm_token": "",
  "authMethod": "line",
  "verification": {
    "ref_code": "REF_XYZ789",
    "code": "123456"
  }
}
```

**Response (200):**
```json
{
  "verification": {
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Employee ID Signup Flow

#### 1. Lookup Employee

**Endpoint:** `POST /v1/public/signup/employee-id/lookup`

**Request:**
```json
{
  "employee_id": "EMP001",
  "identity": "1234567890123",
  "company_id": 128
}
```

**Response (200):**
```json
{
  "is_signup": false,
  "verification_info": {
    "auth_challenge": "CHALLENGE_ABC123"
  }
}
```

#### 2. Add Phone & Request OTP

**Endpoint:** `POST /v1/public/signup/employee-id/phone`

**Query Parameters:**
```
?verification_method=otp&action=request
```

**Request:**
```json
{
  "phone": "0912345678",
  "auth_challenge": "CHALLENGE_ABC123"
}
```

**Response (200):**
```json
{
  "verification": {
    "ref_code": "REF_ABC123"
  }
}
```

#### 3. Verify OTP

**Endpoint:** `POST /v1/public/signup/employee-id/phone`

**Query Parameters:**
```
?verification_method=otp&action=verify
```

**Request:**
```json
{
  "phone": "0912345678",
  "auth_challenge": "CHALLENGE_ABC123",
  "fcm_token": "",
  "verification": {
    "ref_code": "REF_ABC123",
    "code": "123456"
  }
}
```

**Response (200):**
```json
{
  "verification": {
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

## Error Response Format

All error responses follow this format:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

**Common Status Codes:**
- `200` / `201` - Success
- `400` - Bad request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (permission denied)
- `404` - Not found
- `409` - Conflict (constraint violation)
- `500` - Internal server error

---

## Rate Limiting

**Limits:** Not enforced in DEV/STAGING
**Production:** 100 requests/minute per IP

---

## Related Documents

- 📋 [TEST_REQUIREMENTS.md](./TEST_REQUIREMENTS.md) - Test requirements overview
- 📊 [TEST_DATA_REQUIREMENTS.md](./TEST_DATA_REQUIREMENTS.md) - Test data specifications
- 🧪 [TEST_CASES.md](./TEST_CASES.md) - Detailed test cases
