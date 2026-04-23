# Feature: Signup — Phone

User signup using a Thai phone number with OTP verification.

## Flow Summary

```
Request OTP → Verify OTP → Firebase sign in → Create PIN → Get Profile
```

## Test Files

- `api/tests/signup/signup-phone.test.ts`
- `api/helpers/profiles/phone.ts` (seed profile)

## Documents

| File | Purpose |
|------|---------|
| [test-requirements.md](./test-requirements.md) | Objectives, scope, pass/fail criteria, risks |
| [api-contract.md](./api-contract.md) | OTP request/verify endpoint specs |
| [test-data.md](./test-data.md) | Phone, email, employee_id generation |
| [test-cases.md](./test-cases.md) | TC-SIGN-001 |

## Quick Reference

| Test ID | Description | Status |
|---------|-------------|--------|
| TC-SIGN-001 | Complete phone signup flow | ✅ PASS |

## Auth

OTP verification → Firebase custom token → Bearer ID token.
See [shared/authentication.md](../shared/authentication.md).
