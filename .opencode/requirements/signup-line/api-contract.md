# Signup: LINE — API Contract

Base URL: `https://apiv2-{ENV}.salary-hero.com/api`

For Firebase and post-signup endpoints see [shared/authentication.md](../shared/authentication.md).

---

## 1. LINE Signup (Get Auth Challenge)

**`POST /v1/public/signup/line`**

**Headers:** `Content-Type: application/json`

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

**Status Codes:**
- `200` - LINE token accepted; auth challenge issued
- `400` - Invalid channel_id or access_token format
- `401` - Expired LINE access token
- `428` - `line_id` still linked to another user (unique constraint not released)

**Assertions:**
```
body.is_signup = false
body.verification_info.auth_challenge defined
```

---

## 2. Request OTP (with LINE auth challenge)

**`POST /v1/public/signup/line/phone`**

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
    "ref_code": "REF_XYZ789"
  }
}
```

**Status Codes:**
- `200` - OTP sent
- `400` - Invalid phone or auth_challenge
- `428` - Precondition required (line_id constraint violation)

**Assertions:**
```
body.verification.ref_code defined
```

---

## 3. Verify OTP

**`POST /v1/public/signup/line/phone`**

**Query Parameters:** `?verification_method=otp&action=verify`

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

**Status Codes:**
- `200` - Verified; Firebase custom token issued
- `400` - Wrong OTP code or expired ref_code

**Assertions:**
```
body.verification.token defined   ← Firebase custom token
```

**Note:** `auth_challenge` links all three LINE signup steps together. Must be passed unchanged from step 1 → 2 → 3.
