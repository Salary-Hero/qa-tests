# Signup: Employee ID — Test Requirements

## Objectives

1. Verify employee lookup succeeds using `employee_id` + identity (national ID or passport)
2. Confirm auth challenge is issued after successful lookup
3. Validate the OTP and Firebase flow completes identically to phone signup
4. Confirm profile reflects `employee_id` after signup
5. Cover both identity types: national ID (Thai nationals) and passport (international)

## Scope

### In Scope ✅
- `POST /signup/employee-id/lookup` — employee + identity verification
- `POST /signup/employee-id/phone` (request) — OTP request
- `POST /signup/employee-id/phone` (verify) — OTP verification
- Firebase token exchange (shared flow)
- `POST /signup/create-pin` and `GET /signup/profile`
- Both identity types: `national_id` and `passport_no`

### Out of Scope ❌
- Identity document validation against government databases
- Non-Thai passport formats
- Company ID lookup variations

## Pass/Fail Criteria

A test **passes** when:
1. Lookup returns `is_signup: false` with `auth_challenge`
2. OTP request and verify succeed
3. Firebase token exchange succeeds
4. PIN creation returns success
5. Profile returns `employee_id` matching the seeded value

A test **fails** if:
- Lookup returns 404 (employee not seeded or wrong identity value)
- OTP request returns 400 (invalid phone or auth_challenge)
- Profile `employee_id` doesn't match the seeded value

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| `national_id` collision between runs | 🟡 409 on create | Generate fresh 13-digit ID each run |
| `passport_no` collision between runs | 🟡 409 on create | Generate fresh 8-char passport each run |
| `employee_id` mismatch in lookup | 🔴 404 | Seed profile and test share the same generated value via `ctx.identifiers` |
| Firebase `TOKEN_EXPIRED` | 🟡 Flaky | Transient — re-run |

## Execution

```bash
npm run test:api -- api/tests/signup/signup-employee-id.test.ts
```

Two tests run serially. Expected time: 20–30 seconds total.
