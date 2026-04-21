# Feature: Signup — Employee ID

User signup using an employee ID paired with a national ID or passport number for identity verification.

## Flow Summary

```
Lookup employee → Request OTP → Verify OTP → Firebase sign in → Create PIN → Get Profile
```

## Test Files

- `api/tests/signup/signup-employee-id.test.ts`
- `api/helpers/profiles/employee-id.ts` (two seed profiles)

## Documents

| File | Purpose |
|------|---------|
| [test-requirements.md](./test-requirements.md) | Objectives, scope, pass/fail criteria, risks |
| [api-contract.md](./api-contract.md) | Lookup + OTP endpoint specs |
| [test-data.md](./test-data.md) | national_id / passport_no generation, constraints |
| [test-cases.md](./test-cases.md) | TC-SIGN-003 (national ID) and TC-SIGN-004 (passport) |

## Quick Reference

| Test ID | Identity Type | Status |
|---------|--------------|--------|
| TC-SIGN-003 | National ID | ✅ PASS |
| TC-SIGN-004 | Passport number | ✅ PASS |

## Auth

Employee ID + identity lookup → OTP → Firebase token → Bearer ID token.
See [shared/authentication.md](../shared/authentication.md).
