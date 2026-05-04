# Feature: Digital Consent

Digital Consent allows companies to pre-register employees using an Excel file containing placeholder identity data. Once imported, employees can sign up to the Salary Hero app using their identity to verify themselves against the pre-registered data. After signup, HR/admin runs an approval import to activate the employee.

## How It Works

**Phase 1 — Admin imports consent data**

A company admin uploads an Excel file containing employee placeholder records (`employee_id`, `national_id`, `passport_no`). The system processes the file through a 7-step pipeline and stores the records in the `employee_profile` table with `consent_status = 'new'`.

**Phase 2 — Employee signs up**

An employee opens the app, enters their `employee_id` and identity (`national_id` or `passport_no`), fills in personal details, verifies via OTP, sets a PIN, and completes signup. The system transitions their `consent_status` to `'pending_review'`.

**Phase 3 — Admin runs approval import**

After reviewing the submitted consent forms, admin uploads a full employee data Excel file with `approve_action = true`. The system validates identity and bank details, then sets `consent_status = 'approved'` and `users.status` to the value in the `Status` column of the approval xlsx (`'active'` or `'inactive'`).

## Flow Summary

```
Admin:    Upload Excel → Configure → Map columns → Preview → Validate → Import
                                                                              ↓
                                                           employee_profile rows created
                                                           consent_status = 'new'

Employee: Validate identity → Submit form + OTP → Verify OTP → Firebase auth → Create PIN → Get Profile
                                                                                                    ↓
                                                                               consent_status = 'pending_review'

Admin:    Upload approval Excel → Configure → Map columns → Preview → Validate → Import
                                                                                       ↓
                                                                  consent_status = 'approved'
                                                                  users.status = 'active' or 'inactive'
                                                                  (driven by Status column in approval xlsx)
```

## Test Files

- `api/tests/digital-consent/digital-consent.test.ts`
- `api/fixtures/digital-consent-import.xlsx` (4-row screening fixture)
- `api/fixtures/digital-consent-import-approval.xlsx` (2-row approval fixture)
- `api/helpers/digital-consent-import.ts` (7-step screening import helper)
- `api/helpers/digital-consent-approval-import.ts` (7-step approval import helper)
- `api/schema/digital-consent.schema.ts` (Zod response schemas)

## Documents

| File | Purpose |
|------|---------|
| [test-requirements.md](./test-requirements.md) | Objectives, scope, pass/fail criteria, risks |
| [api-contract.md](./api-contract.md) | All 21 endpoint specs (import pipeline + signup flow + approval pipeline) |
| [test-data.md](./test-data.md) | Excel fixtures, identity types, generated fields, lifecycle |
| [test-cases.md](./test-cases.md) | TC-CONSENT-001 through TC-CONSENT-006 with step-by-step tables |

## Quick Reference

| Test ID | Description | Identity Type | Status |
|---------|-------------|---------------|--------|
| TC-CONSENT-001 | Import 4 employees — `consent_status = 'new'` | — | ✅ PASS |
| TC-CONSENT-004 | Non-signed-up employees remain `consent_status = 'new'` | — | ✅ PASS |
| TC-CONSENT-005 | Approve flow (national_id) — `consent_status = 'approved'`, `users.status = 'active'` | `national_id` | ✅ PASS |
| TC-CONSENT-006 | Approve flow (passport_no) — `consent_status = 'approved'`, `users.status = 'inactive'` | `passport_no` | ✅ PASS |

## Key Difference vs Employee ID Only Flow

| Aspect | Standard (`digital_consent`) | Employee ID Only (`digital_consent_employee_id`) |
|---|---|---|
| Screening import columns | `employee_id + national_id + passport_no` | `employee_id` only |
| `screening` key in request form | `{ employee_id, personal_id }` | `{ employee_id }` only |
| Identity in `request_form` | Not included | `personal_id` included by user |
| Approval fixture overrides | `phone` + `account_no` only (identity fixed in fixture) | `phone` + `national_id`/`passport_no` + `account_no` (all dynamic) |

## Auth

- **Import phases:** Admin Bearer token — see [shared/authentication.md](../shared/authentication.md)
- **Signup phase:** OTP → Firebase custom token → Firebase ID token → Bearer ID token
