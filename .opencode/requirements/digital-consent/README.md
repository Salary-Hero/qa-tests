# Feature: Digital Consent

Digital Consent allows companies to pre-register employees using an Excel file containing placeholder identity data. Once imported, employees can sign up to the Salary Hero app using their identity to verify themselves against the pre-registered data.

## How It Works

**Phase 1 — Admin imports consent data**

A company admin uploads an Excel file containing employee placeholder records (`employee_id`, `national_id`, `passport_no`). The system processes the file through a 7-step pipeline and stores the records in the `employee_profile` table with `consent_status = 'new'`.

**Phase 2 — Employee signs up**

An employee opens the app, enters their `employee_id` and identity (`national_id` or `passport_no`), fills in personal details, verifies via OTP, sets a PIN, and completes signup. The system transitions their `consent_status` to `'pending_review'`.

## Flow Summary

```
Admin:    Upload Excel → Configure → Map columns → Preview → Validate → Import
                                                                              ↓
                                                           employee_profile rows created
                                                           consent_status = 'new'

Employee: Validate identity → Submit form + OTP → Verify OTP → Firebase auth → Create PIN → Get Profile
                                                                                                    ↓
                                                                               consent_status = 'pending_review'
```

## Test Files

- `api/tests/digital-consent/digital-consent.test.ts`
- `api/fixtures/digital-consent-import.xlsx` (4-row test Excel fixture)
- `api/helpers/digital-consent-import.ts` (7-step import helper)
- `api/schema/digital-consent.schema.ts` (Zod response schemas)

## Documents

| File | Purpose |
|------|---------|
| [test-requirements.md](./test-requirements.md) | Objectives, scope, pass/fail criteria, risks |
| [api-contract.md](./api-contract.md) | All 15 endpoint specs (import pipeline + signup flow) |
| [test-data.md](./test-data.md) | Excel fixture data, identity types, generated fields, lifecycle |
| [test-cases.md](./test-cases.md) | TC-CONSENT-001 through TC-CONSENT-004 with step-by-step tables |

## Quick Reference

| Test ID | Description | Identity Type | Status |
|---------|-------------|---------------|--------|
| TC-CONSENT-001 | Import 4 employees, verify `consent_status = 'new'` | — | ✅ PASS |
| TC-CONSENT-002 | Signup with national ID, verify `consent_status = 'pending_review'` | `national_id` | ✅ PASS |
| TC-CONSENT-003 | Signup with passport number, verify `consent_status = 'pending_review'` | `passport_no` | ✅ PASS |
| TC-CONSENT-004 | Verify non-signed-up employees remain `consent_status = 'new'` | — | ✅ PASS |

## Auth

- **Import phase:** Admin Bearer token — see [shared/authentication.md](../shared/authentication.md)
- **Signup phase:** OTP → Firebase custom token → Firebase ID token → Bearer ID token
