# Feature: Signup — LINE

User signup using a LINE account, followed by phone OTP to link a phone number.

## Flow Summary

```
LINE auth challenge → Request OTP → Verify OTP → Firebase sign in → Create PIN → Get Profile
```

## Test Files

- `api/tests/signup/signup-line.test.ts`
- `api/helpers/profiles/line.ts` (seed profile)
- `api/helpers/line-auth.ts` (LINE token helper)

## Documents

| File | Purpose |
|------|---------|
| [test-requirements.md](./test-requirements.md) | Objectives, scope, pass/fail criteria, risks |
| [api-contract.md](./api-contract.md) | LINE signup + OTP endpoint specs |
| [test-data.md](./test-data.md) | Fixed LINE ID, constraint handling, generated fields |
| [test-cases.md](./test-cases.md) | TC-SIGN-002 |

## Quick Reference

| Test ID | Description | Status |
|---------|-------------|--------|
| TC-SIGN-002 | Complete LINE signup flow | ✅ PASS |

## Auth

LINE access token → auth challenge → OTP → Firebase token → Bearer ID token.
See [shared/authentication.md](../shared/authentication.md).
