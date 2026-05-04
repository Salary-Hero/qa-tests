# Digital Consent — Test Data

## Screening Import Fixture

**File:** `api/fixtures/digital-consent-import.xlsx`

4 rows with deterministic, fixed data. Column headers must exactly match the mapping configured in import Step 3.

| Employee ID | National ID | Passport No | Used In |
|-------------|-------------|-------------|---------|
| EMPAPI-CONSENT-001 | 2001000099000 | TSPP1900 | TC-CONSENT-002, TC-CONSENT-005 |
| EMPAPI-CONSENT-002 | 2001000099001 | TSPP1901 | TC-CONSENT-003, TC-CONSENT-006 |
| EMPAPI-CONSENT-003 | 2001000099002 | TSPP1902 | TC-CONSENT-004 (state check — no signup) |
| EMPAPI-CONSENT-004 | 2001000099003 | TSPP1903 | TC-CONSENT-004 (state check — no signup) |

**Column header requirements:**
- Must be exactly: `Employee ID`, `National ID`, `Passport No`
- Headers are case-sensitive and must match the column mapping in Step 3
- Any mismatch results in 0 rows in the preview

## Approval Import Fixture

**File:** `api/fixtures/digital-consent-import-approval.xlsx`

Used in TC-CONSENT-005 and TC-CONSENT-006. Contains full employee data for the employees who have submitted their consent request form and are awaiting approval.

The `Status` column controls `users.status` after the approval import runs. This is the HR/admin decision embedded in the fixture — it is not driven by the API.

| Column | EMPAPI-CONSENT-001 | EMPAPI-CONSENT-002 | Notes |
|--------|--------------------|--------------------|-------|
| Employee ID | `EMPAPI-CONSENT-001` | `EMPAPI-CONSENT-002` | Fixed |
| First Name | `QA` | `QA` | Fixed |
| Last Name | `Consent` | `Consent` | Fixed |
| National ID | `2001000099000` | `2001000099001` | Fixed — matches screening fixture |
| Passport No | `TSPP1900` | `TSPP1901` | Fixed — matches screening fixture |
| Mobile | *(placeholder)* | *(placeholder)* | **Overridden at runtime** — must match signup phone |
| Bank Account Number | *(placeholder)* | *(placeholder)* | **Overridden at runtime** — must be unique per run |
| Bank Account Name | `QA Consent` | `QA Consent` | Fixed |
| Bank Name | `SCB` | `KBANK` | Fixed |
| Disbursement Type | `Bank` | `Bank` | Fixed |
| Salary | `30000` | `40000` | Fixed |
| Salary Type | `Monthly` | `Monthly` | Fixed |
| Pay Cycle Name | `Monthly` | `Monthly` | Fixed |
| Pay Cycle Code | `monthly` | `monthly` | Fixed |
| **Status** | **`active`** | **`inactive`** | Fixed — controls `users.status` after approval |
| (other columns) | null/empty | null/empty | Not required for approval |

**Key design note:** `national_id` and `passport_no` are **fixed in the fixture** because they were pre-loaded in the screening import. The API validates that the identity values in the approval xlsx match those submitted during signup. Since these values are known and stable, only `phone` and `account_no` need to be overridden at runtime via `buildApprovalXlsx()`.

This is different from the Employee ID Only flow, where identity values are user-declared during signup and must also be overridden dynamically.

## Generated Fields (fresh per test run)

These fields are generated uniquely for each signup and approval test to avoid unique constraint violations on re-runs.

| Field | Generator | Example | Used In |
|-------|-----------|---------|---------|
| `phone` | `resolvePhone()` | `09{8-random-digits}` | Signup steps 9, 10; approval import override |
| `email` | `generateEmail()` | `qa-signup-{ts}-{rand}@test.example.com` | Signup step 9 `request_form` |
| `account_no` | `generateAccountNo()` | `1{9-random-digits}` | Approval import override |

`phone` is captured during signup and passed directly to `importDigitalConsentApprovalData()` as a row override. This guarantees the approval xlsx contains the exact phone the employee submitted in their consent request form.

`account_no` is generated fresh per approval test run to avoid the global bank account uniqueness constraint.

## Fixed Test Values

| Field | Value | Source | Used In |
|-------|-------|--------|---------|
| `company_id` | `514` | `getCompany('digital_consent').id` | All steps |
| `personal_id_type` (TC-CONSENT-002, TC-CONSENT-005) | `"national_id"` | Fixed | Steps 8, 9 |
| `personal_id_type` (TC-CONSENT-003, TC-CONSENT-006) | `"passport_no"` | Fixed | Steps 8, 9 |
| `personal_id` (TC-CONSENT-002, TC-CONSENT-005) | `"2001000099000"` | Screening fixture | Steps 8, 9 |
| `personal_id` (TC-CONSENT-003, TC-CONSENT-006) | `"TSPP1901"` | Screening fixture | Steps 8, 9 |
| OTP code | `seedConfigForEnv.otp` | DEV: `"111111"` / STAGING: `"199119"` | Step 10 |
| PIN code | `process.env.PINCODE` | `.env` file | Step 13 |
| `first_name` | `"QA"` | Fixed | Step 9 `request_form` |
| `last_name` | `"Consent"` | Fixed | Step 9 `request_form` |
| Approval `Status` (TC-CONSENT-005) | `"active"` | Approval fixture row 1 | Step 21 outcome |
| Approval `Status` (TC-CONSENT-006) | `"inactive"` | Approval fixture row 2 | Step 21 outcome |

## Identity Types

Two identity types are tested, one per signup test:

| Test | `personal_id_type` | `personal_id` value | Employee |
|------|-------------------|---------------------|---------|
| TC-CONSENT-002 / TC-CONSENT-005 | `"national_id"` | `"2001000099000"` | EMPAPI-CONSENT-001 |
| TC-CONSENT-003 / TC-CONSENT-006 | `"passport_no"` | `"TSPP1901"` | EMPAPI-CONSENT-002 |

`personal_id` is fixed — it comes from the screening fixture and must match the approval fixture exactly.

## Approval Import Validation Constraints

| Constraint | Rule | Consequence if violated |
|---|---|---|
| Phone match | `phone` in approval xlsx must exactly match the phone submitted in the consent request form | Row rejected — `approve_num_row = 0` |
| Identity match | `national_id` or `passport_no` in approval xlsx must match the value from the screening fixture (which matches what the employee validated against during signup) | Row rejected |
| Bank uniqueness | `account_no` must be globally unique across all banks in `user_bank` | Row rejected |
| Consent status | Employee must have `consent_status = 'pending_review'` to be eligible for approval | Row not included in `approve_rows` |

## Unique Constraints

| Field | Constraint | Handling |
|-------|-----------|----------|
| `email` | Unique globally | Generated fresh per run |
| `phone` | Unique within paycycle | Generated fresh per run |
| `account_no` | Unique globally across all banks | Generated fresh per run |
| `employee_id` + `company_id` | Unique in `employee_profile` | Pre-seed DB cleanup removes previous run's rows |

## Data Lifecycle

```
beforeAll:
  1. cleanupConsentSignedUpUsers — hard-delete any signed-up users from previous runs
  2. deleteEmployeeProfileRecords — wipe employee_profile + audit rows
  3. Admin login → adminToken
  4. Run 7-step screening import with digital-consent-import.xlsx
  5. Poll until 4 employee_profile rows with consent_status = 'new' are confirmed in DB

TC-CONSENT-001:
  6. DB query verifies all 4 rows exist with consent_status = 'new'

TC-CONSENT-002 (EMPAPI-CONSENT-001 — national_id):
  7. Generate fresh phone + email
  8. Run signup steps 8–15
  9. DB verify: consent_status = 'pending_review'
  afterEach:
  10. hardDeleteEmployee(signedUpUserId)
      → deletes user record, resets employee_profile to consent_status = 'new'

TC-CONSENT-003 (EMPAPI-CONSENT-002 — passport_no):
  11. Generate fresh phone + email
  12. Run signup steps 8–15
  13. DB verify: consent_status = 'pending_review'
  afterEach:
  14. hardDeleteEmployee(signedUpUserId)

TC-CONSENT-004 (EMPAPI-CONSENT-003, EMPAPI-CONSENT-004):
  15. DB query only — no API calls, no data created

TC-CONSENT-005 (EMPAPI-CONSENT-001 — national_id + approval):
  16. Generate fresh phone, email, accountNo
  17. Run signup steps 8–15
  18. Run 7-step approval import with phone and accountNo overrides
  19. Wait for backend processing
  20. DB verify: consent_status = 'approved', users.status = 'active'
  afterEach:
  21. hardDeleteEmployee(signedUpUserId)

TC-CONSENT-006 (EMPAPI-CONSENT-002 — passport_no + approval):
  22. Generate fresh phone, email, accountNo
  23. Run signup steps 8–15
  24. Run 7-step approval import with phone and accountNo overrides
  25. Wait for backend processing
  26. DB verify: consent_status = 'approved', users.status = 'inactive'
  afterEach:
  27. hardDeleteEmployee(signedUpUserId)

afterAll:
  28. cleanupConsentSignedUpUsers — cleanup in case any test failed mid-run
  29. deleteEmployeeProfileRecords — full profile cleanup
```

## Cleanup Notes

**`hardDeleteEmployee` behavior for consent rows:**
`hardDeleteEmployee(userId)` does not delete the `employee_profile` row. Instead it resets the row to `consent_status = 'new'`, `user_id = NULL`, `employment_id = NULL`. This keeps the row available for subsequent serial tests that need to call the screening validate endpoint against the same employee.

**Why DB cleanup is needed for `employee_profile` in `beforeAll`/`afterAll`:**
There is no API endpoint to delete consent/screening records. Direct DB cleanup is the only way to fully reset state between test suite runs.

**Why `afterEach` uses `hardDeleteEmployee` rather than an API delete:**
After approval (TC-CONSENT-005, TC-CONSENT-006), the user has `users.status = 'active'` or `'inactive'`. `hardDeleteEmployee` handles both statuses correctly — it performs a hard delete regardless of user status.

**Repeatability guarantee:**
`beforeAll` cleanup + `afterAll` cleanup + `afterEach` hard-delete ensure the test suite can be run any number of times without manual DB intervention.
