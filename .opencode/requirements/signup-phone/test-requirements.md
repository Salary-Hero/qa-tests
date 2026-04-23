# Signup: Phone — Test Requirements

## Objectives

1. Verify the complete phone OTP signup flow end-to-end
2. Confirm OTP request and verification return correct state transitions
3. Validate Firebase token exchange succeeds after OTP verification
4. Ensure PIN creation completes successfully
5. Confirm profile reflects signup completion (`has_pincode: true`, `signup_at` set)

## Scope

### In Scope ✅
- `POST /signup/phone/otp/request` — OTP request
- `POST /signup/phone/otp/verify` — OTP verification
- Firebase custom token → ID token exchange
- `POST /signup/create-pin` — PIN creation
- `GET /signup/profile` — profile confirmation

### Out of Scope ❌
- SMS delivery verification (OTP is fixed in test env)
- Real Firebase project setup (uses test credentials)
- Rate limiting on OTP requests

## Pass/Fail Criteria

A test **passes** when:
1. OTP request returns `is_signup: false` and `next_state: "signup.phone.verify"`
2. OTP verify returns `is_signup: true` and `next_state: "user.profile"`
3. Firebase sign-in and token refresh both succeed
4. PIN creation returns `"Create PIN successfully"`
5. Profile returns `phone = original`, `has_pincode: true`, `signup_at != null`

A test **fails** if:
- Any step returns an unexpected status code
- State transitions are incorrect
- Firebase token is expired or invalid
- Profile does not reflect signup completion

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Phone number reuse across test runs | 🔴 409 on OTP request | Generate fresh phone each run |
| Firebase `TOKEN_EXPIRED` error | 🟡 Flaky test | Transient — re-run; test env token refresh is fast |
| Fixed OTP `123456` not accepted | 🔴 400 on verify | Verify `OTP` env var is set correctly in `.env` |

## Execution

```bash
npm run test:api -- api/tests/signup/signup-phone.test.ts
```

Runs serially. Expected time: 9–12 seconds.
