# Digital Consent — Test Data

## Excel Fixture

**File:** `api/fixtures/digital-consent-import.xlsx`

4 rows with deterministic, fixed data. Column headers must exactly match the mapping configured in import Step 3.

| Employee ID | National ID | Passport No | Used In |
|-------------|-------------|-------------|---------|
| TS01900 | 2001000099000 | TSPP1900 | TC-CONSENT-002 (national_id signup) |
| TS01901 | 2001000099001 | TSPP1901 | TC-CONSENT-003 (passport_no signup) |
| TS01902 | 2001000099002 | TSPP1902 | TC-CONSENT-004 (state check — no signup) |
| TS01903 | 2001000099003 | TSPP1903 | TC-CONSENT-004 (state check — no signup) |

**Column header requirements:**
- Must be exactly: `Employee ID`, `National ID`, `Passport No`
- Headers are case-sensitive and must match the column mapping in Step 3
- Any mismatch results in 0 rows in the preview

## Generated Fields (fresh per test run)

These fields are generated uniquely for each signup test to avoid unique constraint violations on re-runs.

| Field | Generator | Example | Used In |
|-------|-----------|---------|---------|
| `phone` | `generatePhone()` | `09{8-random-digits}` | Steps 9, 10 |
| `email` | `generateEmail()` | `qa-signup-{ts}-{rand}@test.example.com` | Step 9 `request_form` |

Both are generated independently for TC-CONSENT-002 and TC-CONSENT-003 — each signup test uses its own fresh values.

## Fixed Test Values

| Field | Value | Source | Used In |
|-------|-------|--------|---------|
| `company_id` | `514` | `seed-config.json` (digital_consent) | All steps |
| `personal_id_type` (TC-002) | `"national_id"` | Hardcoded | Steps 8, 9 |
| `personal_id_type` (TC-003) | `"passport_no"` | Hardcoded | Steps 8, 9 |
| OTP code | `seedConfigForEnv.otp` | DEV: `"111111"` / STAGING: `"199119"` | Step 10 |
| PIN code | `process.env.PINCODE` | `.env` file | Step 13 |
| `first_name` | `"QA"` | Hardcoded | Step 9 `request_form` |
| `last_name` | `"Consent"` | Hardcoded | Step 9 `request_form` |

## Identity Types

Two identity types are tested, one per signup test:

| Test | `personal_id_type` | `personal_id` value | Employee |
|------|-------------------|---------------------|---------|
| TC-CONSENT-002 | `"national_id"` | `"2001000099000"` | TS01900 |
| TC-CONSENT-003 | `"passport_no"` | `"TSPP1901"` | TS01901 |

`personal_id_type` is sent in both Step 8 (screening validate) and Step 9 (request form).

## Unique Constraints

| Field | Constraint | Handling |
|-------|-----------|----------|
| `email` | Unique globally | Generated fresh per run |
| `phone` | Unique within paycycle | Generated fresh per run |
| `employee_id` + `company_id` | Unique in `employee_profile` | Pre-seed DB cleanup removes previous run's rows |

## Data Lifecycle

```
beforeAll:
  1. DELETE FROM employee_profile
     WHERE employee_id IN ('TS01900','TS01901','TS01902','TS01903')
       AND company_id = 514
        ↓
  2. Run 7-step import with digital-consent-import.xlsx
        ↓
  3. 4 rows created in employee_profile with consent_status = 'new'

TC-CONSENT-001:
  4. DB query verifies all 4 rows exist with consent_status = 'new'

TC-CONSENT-002 (TS01900 — national_id):
  5. Generate fresh phone + email
  6. Run signup steps 8–15
  7. DB verify: consent_status = 'pending_review' for TS01900
  afterEach:
  8. DELETE /v1/admin/account/employee/{user_id}  (cascades to users table)

TC-CONSENT-003 (TS01901 — passport_no):
  9. Generate fresh phone + email
  10. Run signup steps 8–15
  11. DB verify: consent_status = 'pending_review' for TS01901
  afterEach:
  12. DELETE /v1/admin/account/employee/{user_id}

TC-CONSENT-004 (TS01902, TS01903):
  13. DB query only — no API calls, no data created

afterAll:
  14. DELETE FROM employee_profile
      WHERE employee_id IN ('TS01900','TS01901','TS01902','TS01903')
        AND company_id = 514
```

## Cleanup Notes

**Why DB cleanup is needed for `employee_profile`:**
There is no API endpoint to delete consent/screening records. The `employee_profile` table supports soft deletes via `deleted_at`, but since no delete API exists, direct DB queries are used. This is the only place in the test suite where direct DB cleanup is performed.

**Why API cleanup is used for users:**
After signup, the user record in the `users` table is deleted via the admin API (`DELETE /v1/admin/account/employee/{userId}`). The backend cascades this deletion to `employment`, `user_identity`, `user_balance`, and other related tables.

**Repeatability guarantee:**
`beforeAll` cleanup + `afterAll` cleanup ensure the test can be run any number of times without manual intervention. Even if a test run is aborted mid-way, the next `beforeAll` will clean up any leftover records before importing fresh data.
