# Digital Consent Employee ID Only — Test Data

## Company

| Field | Dev | Staging |
|---|---|---|
| Company name | QA - Digital Consent Employee ID | QA - Digital Consent Employee ID |
| Company ID | 866 | 1316 |
| Paycycle ID | 3107 | 5206 |
| Config key | `digital_consent_employee_id` | `digital_consent_employee_id` |

## Import Fixture

File: `api/fixtures/digital-consent-employee-id-import.xlsx`

**Columns:** `Employee ID` (only — no national_id or passport_no)

| Row | Employee ID |
|---|---|
| 1 | `EMPAPI-CONSENT-EID-001` |
| 2 | `EMPAPI-CONSENT-EID-002` |
| 3 | `EMPAPI-CONSENT-EID-003` |
| 4 | `EMPAPI-CONSENT-EID-004` |

## Dynamic Identifiers (generated fresh per run)

| Field | Generator | Purpose |
|---|---|---|
| `phone` | `resolvePhone()` | Receives OTP — uses pool on staging |
| `email` | `generateEmail()` | Included in request_form |
| `national_id` | `generateNationalId()` | User-provided identity for TC-CONSENT-EID-002 |
| `passport_no` | `generatePassportNo()` | User-provided identity for TC-CONSENT-EID-003 |

All identifiers are generated using `Date.now()` + random to guarantee uniqueness per run.

## OTP

| Environment | Value | Source |
|---|---|---|
| Dev | `111111` | `seed-config.json` → `dev.otp` |
| Staging | `199119` | `seed-config.json` → `staging.otp` |

## Cleanup Strategy

Since the import file has no pre-loaded `national_id`/`passport_no`, cleanup cannot use `findSignedUpUserIds()`. Instead it uses `findSignedUpUserIdsByEmployeeIds()` which searches by `employment.employee_id + company_id`.

Both `beforeAll` and `afterAll` run:
1. `findSignedUpUserIdsByEmployeeIds(TEST_EMPLOYEE_IDS, COMPANY_ID)` → `hardDeleteEmployee()` for each
2. `deleteEmployeeProfileRecords(TEST_EMPLOYEE_IDS, COMPANY_ID)` — clears `employee_profile_audit` + `employee_profile`

`afterEach` hard-deletes the user who signed up in that specific test.
