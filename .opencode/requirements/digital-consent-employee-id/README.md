# Digital Consent — Employee ID Only

## Feature Overview

This feature tests the digital consent signup and approval flow for companies that configure their import file with **employee_id only** — no national_id or passport_no pre-loaded.

Unlike the standard digital consent flow where employee identity is pre-loaded from the import file, this variant requires users to **self-declare** their identity during the consent request form step. After the user submits their form, HR/admin reviews and runs an approval import to activate the employee.

## Business Purpose

Allow companies to use digital consent screening with employee_id only, then approve employees by uploading a full employee data file after reviewing their submitted consent form.

## Full Flow

```
Phase 1 — Screening Import (Steps 1–7)
  Admin uploads xlsx (employee_id only)
  ↓ employee_profile created: consent_status = 'new', users.status = 'inactive'

Phase 2 — Employee Signup (Steps 8–14)
  Employee opens mobile app
  → validate employee_id exists
  → submit consent form (first_name, last_name, national_id or passport_no, phone, email)
  → verify OTP
  → Firebase sign-in
  → create PIN
  → get profile
  ↓ employee_profile.consent_status = 'pending_review'
    users.status = 'inactive' (unchanged)

Phase 3 — Approval Import (Steps 15–21)
  Admin uploads xlsx (full employee data) with approve_action = true
  ↓ employee_profile.consent_status = 'approved'
    users.status = 'active'
    Employee can now use EWA service
```

## Company Details

| Environment | Company | ID | Paycycle ID |
|---|---|---|---|
| Dev | QA - Digital Consent Employee ID | 866 | 3107 |
| Staging | QA - Digital Consent Employee ID | 1316 | 5206 |

Use `getCompany('digital_consent_employee_id').id` — never hardcode the ID.

## Fixture Employees

| Employee ID | Used in |
|---|---|
| `EMPAPI-CONSENT-EID-001` | TC-CONSENT-EID-002, TC-CONSENT-EID-005 |
| `EMPAPI-CONSENT-EID-002` | TC-CONSENT-EID-003 |
| `EMPAPI-CONSENT-EID-003` | TC-CONSENT-EID-004 (non-signed-up check) |
| `EMPAPI-CONSENT-EID-004` | TC-CONSENT-EID-004 (non-signed-up check) |

## Documents

| File | Purpose |
|------|---------|
| [api-contract.md](./api-contract.md) | All 21 endpoint specs (screening import + signup + approval import) |
| [test-requirements.md](./test-requirements.md) | Objectives, scope, pass/fail criteria, risks |
| [test-data.md](./test-data.md) | Fixtures, identifiers, consent_status transition map, cleanup strategy |
| [test-cases.md](./test-cases.md) | TC-CONSENT-EID-001 through TC-CONSENT-EID-005 |

## Quick Reference

| Test ID | Operation | Status |
|---------|-----------|--------|
| TC-CONSENT-EID-001 | Screening import → `consent_status = new` | ✅ PASS |
| TC-CONSENT-EID-002 | Signup with `national_id` → `consent_status = pending_review` | ✅ PASS |
| TC-CONSENT-EID-003 | Signup with `passport_no` → `consent_status = pending_review` | ✅ PASS |
| TC-CONSENT-EID-004 | Non-signed-up employees stay `consent_status = new` | ✅ PASS |
| TC-CONSENT-EID-005 | Full approve flow → `consent_status = approved`, `status = active` | 🔲 PLANNED |

## Key Difference vs Standard Consent Flow

| Aspect | Standard (`digital_consent`) | Employee ID Only (`digital_consent_employee_id`) |
|---|---|---|
| Screening import columns | `employee_id + national_id + passport_no` | `employee_id` only |
| `screening` key in request form | `{ employee_id, personal_id }` | `{ employee_id }` only |
| Identity in `request_form` | Not included | `personal_id` included by user |
| Has approval import phase | No | Yes — steps 15–21 via `/v3/admin/account/employee-import/` |

## Auth

Admin Bearer token. Obtained via `getAdminToken()` from `api/helpers/admin-console-auth.ts`.
Employee steps use Firebase ID token obtained during the signup flow.
