# Shared: Authentication

Covers admin login (Bearer token) and Firebase token exchange, used across all feature tests.

## Admin Login

**Endpoint:** `POST /v1/public/account/admin/login`

**Request:**
```json
{ "email": "admin@example.com", "password": "password123" }
```

**Response (200):**
```json
{ "accessToken": "eyJ...", "refreshToken": "eyJ..." }
```

**Status Codes:**
- `200` - Login successful
- `400` - Missing fields
- `401` - Invalid credentials

All subsequent admin API calls require: `Authorization: Bearer {accessToken}`

Token is cached per test run (valid ~1 hour). Implementation: `api/helpers/admin-auth.ts`

---

## Firebase Token Exchange

Used by all signup flows after OTP verification to authenticate the user session.

### Sign In with Custom Token

**Endpoint:** `POST https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key={FIREBASE_API_KEY}`

**Request:**
```json
{ "token": "{firebase_custom_token}", "returnSecureToken": true }
```

**Response (200):**
```json
{ "idToken": "eyJ...", "refreshToken": "eyJ...", "expiresIn": "3600" }
```

### Refresh ID Token

**Endpoint:** `POST https://securetoken.googleapis.com/v1/token?key={FIREBASE_API_KEY}`

**Request:**
```json
{ "grant_type": "refresh_token", "refresh_token": "{refresh_token}" }
```

**Response (200):**
```json
{ "id_token": "eyJ...", "refresh_token": "eyJ...", "expires_in": "3600" }
```

**Status Codes (both):**
- `200` - Token issued
- `400` - `TOKEN_EXPIRED` or `INVALID_REFRESH_TOKEN`
- `400` - `API_KEY_INVALID`

**Notes:**
- ID token expires in 1 hour
- Refresh token is long-lived
- Tests call refresh twice: once pre-PIN (to create PIN) and once post-PIN (to get profile)
- `TOKEN_EXPIRED` errors during tests are transient — re-run the test

Implementation: `api/helpers/firebase.ts`

---

## Shared Post-Signup Endpoints

Used by all signup flows once Firebase auth is established.

### Create PIN

**Endpoint:** `POST /v1/public/signup/create-pin`

**Headers:** `Authorization: Bearer {firebase_id_token}`

**Request:**
```json
{ "pincode": "999999" }
```

**Response (200):**
```json
{ "message": "Create PIN successfully" }
```

### Get Profile

**Endpoint:** `GET /v1/public/signup/profile`

**Headers:** `Authorization: Bearer {firebase_id_token}`

**Response (200):**
```json
{
  "profile": {
    "phone": "0912345678",
    "employee_id": "EMP123",
    "line_id": null,
    "has_pincode": true,
    "signup_at": "2026-04-21T08:30:00Z"
  }
}
```

### Logout

**Endpoint:** `POST /v1/public/signup/logout`

**Headers:** `Authorization: Bearer {firebase_id_token}`

**Note:** Best-effort — test does not fail if this returns an error.
