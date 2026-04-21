# Signup: Employee ID — API Contract

Base URL: `https://apiv2-{ENV}.salary-hero.com/api`

For Firebase and post-signup endpoints see [shared/authentication.md](../shared/authentication.md).

---

## 1. Lookup Employee

**`POST /v1/public/signup/employee-id/lookup`**

**Headers:** `Content-Type: application/json`

**Request:**
```json
{
  "employee_id": "EMP17451234560001",
  "identity": "1234567890123",
  "company_id": 128
}
```

`identity` is either a 13-digit national ID or a passport number (e.g., `AB123456`). The backend determines the type automatically.

**Response (200):**
```json
{
  "is_signup": false,
  "verification_info": {
    "auth_challenge": "CHALLENGE_ABC123"
  }
}
```

**Status Codes:**
- `200` - Employee found and identity verified; auth challenge issued
- `400` - Invalid `employee_id` or `identity` format
- `404` - Employee not found, or identity does not match

**Assertions:**
```
body.is_signup = false
body.verification_info.auth_challenge defined
```

---

## 2. Request OTP

**`POST /v1/public/signup/employee-id/phone`**

**Query Parameters:** `?verification_method=otp&action=request`

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

**Status Codes:**
- `200` - OTP sent
- `400` - Invalid phone or auth_challenge

**Assertions:**
```
body.verification.ref_code defined
```

---

## 3. Verify OTP

**`POST /v1/public/signup/employee-id/phone`**

**Query Parameters:** `?verification_method=otp&action=verify&...` (see `EMPLOYEE_ID_VERIFY_PARAMS` in `api/helpers/request.ts`)

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

**Status Codes:**
- `200` - Verified; Firebase custom token issued
- `400` - Wrong OTP code or expired ref_code

**Assertions:**
```
body.verification.token defined   ← Firebase custom token
```

**Note:** The same `auth_challenge` must be passed through all three steps.
