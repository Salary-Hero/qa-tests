# Signup: Phone — API Contract

Base URL: `https://apiv2-{ENV}.salary-hero.com/api`

For Firebase and post-signup endpoints (Create PIN, Get Profile, Logout) see [shared/authentication.md](../shared/authentication.md).

---

## 1. Request OTP

**`POST /v1/public/signup/phone/otp/request`**

**Headers:** `Content-Type: application/json`

**Request:**
```json
{ "phone": "0912345678" }
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

**Status Codes:**
- `200` - OTP sent
- `400` - Invalid phone format
- `429` - Too many OTP requests

**Assertions:**
```
body.is_signup = false
body.next_state = "signup.phone.verify"
body.verification_info.ref_code defined
```

---

## 2. Verify OTP

**`POST /v1/public/signup/phone/otp/verify`**

**Query Parameters:**
```
?verification_method=otp&action=verify&thaiId=0&otpSendType=sms
```

**Headers:** `Content-Type: application/json`

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

**Status Codes:**
- `200` - OTP verified; Firebase custom token issued
- `400` - Wrong OTP code or expired ref_code
- `404` - Phone number not found (employee not seeded)

**Assertions:**
```
body.is_signup = true
body.next_state = "user.profile"
body.verification_info.token defined   ← Firebase custom token for next step
```

**State transition:**
```
signup.phone.verify → user.profile
```
