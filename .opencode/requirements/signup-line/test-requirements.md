# Signup: LINE — Test Requirements

## Objectives

1. Verify LINE access token exchange returns a valid auth challenge
2. Confirm OTP request and verification work with LINE auth context
3. Validate Firebase token exchange succeeds after LINE+OTP verification
4. Ensure PIN creation and profile confirmation complete correctly
5. Verify `line_id` cleanup releases the unique constraint for the next test run

## Scope

### In Scope ✅
- `POST /signup/line` — LINE access token → auth challenge
- `POST /signup/line/phone` (request) — OTP request with auth challenge
- `POST /signup/line/phone` (verify) — OTP verification
- Firebase token exchange (shared flow)
- `POST /signup/create-pin` and `GET /signup/profile`
- Pre/post-test cleanup including `line_id` null-clear

### Out of Scope ❌
- Full LINE OAuth flow (test uses pre-obtained access token)
- LINE push notifications
- LINE rich menu integration

## Pass/Fail Criteria

A test **passes** when:
1. LINE signup returns `is_signup: false` with `auth_challenge`
2. OTP request succeeds with the auth challenge
3. OTP verify returns Firebase custom token
4. PIN creation and profile confirmation match phone signup behavior
5. Profile returns `line_id` matching the fixed seed value

A test **fails** if:
- LINE signup returns 400/401 (invalid or expired access token)
- OTP request returns 428 (line_id still has unique constraint from previous run)
- Any subsequent step returns unexpected status

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| `line_id` unique constraint from previous run | 🔴 428 on OTP request | Clear `line_id` to null via PATCH before deletion in cleanup |
| LINE access token expired | 🔴 401 on LINE signup | Refresh `LINE_ACCESS_TOKEN` env var |
| Fixed `line_id` conflicts across environments | 🟡 409 | Use separate seed config per ENV |

## Execution

```bash
npm run test:api -- api/tests/signup/signup-line.test.ts
```

Runs serially (`must-be-serial`). Expected time: 15–20 seconds.
