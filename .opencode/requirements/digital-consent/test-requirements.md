# Digital Consent — Test Requirements

## Objectives

1. Verify the 7-step admin import pipeline successfully creates consent placeholder records in the database
2. Confirm imported records have `consent_status = 'new'` before any signup occurs
3. Validate that a user can complete the full Digital Consent signup flow using a **national ID** as their identity
4. Validate that a user can complete the full Digital Consent signup flow using a **passport number** as their identity
5. Confirm that employees who have not signed up remain at `consent_status = 'new'` — import does not affect non-participating records
6. Ensure the test suite is fully repeatable — cleanup removes all test data so re-runs are safe

## Audience

This document is intended for QA engineers, backend developers, and product managers who need to understand what is being tested and why.

## Scope

### In Scope ✅

- 7-step admin import pipeline (upload Excel → configure → map → preview → validate → import)
- `employee_profile` DB state after import (`consent_status = 'new'`)
- Consent signup using `personal_id_type: "national_id"`
- Consent signup using `personal_id_type: "passport_no"`
- Firebase token exchange as part of signup
- PIN creation and profile verification post-signup
- `employee_profile` DB state after signup (`consent_status = 'pending_review'`)
- State isolation — non-signed-up employees unaffected by signup activity
- Full cleanup and test repeatability

### Out of Scope ❌

- `update_action` and `delete_action` import modes (only `create_action: true` tested)
- Import validation errors (wrong column headers, missing fields, duplicate data)
- Consent approval workflow (HR reviewing `pending_review` records)
- Staging and production environments (TBD — company IDs not yet configured)
- UI/frontend flows
- Performance or load testing

## Pass/Fail Criteria

### Import Phase (TC-CONSENT-001)

A test **passes** when:
1. All 7 import steps return HTTP 200
2. Step 5 preview response contains all 4 expected `employee_id` values in `create_rows`
3. Steps 6 and 7 return `{ "message": "success" }`
4. DB query confirms 4 rows in `employee_profile` with `consent_status = 'new'`

A test **fails** if:
- Any import step returns a non-200 status
- Preview does not contain expected rows
- DB rows are missing or have incorrect `consent_status`

### Signup Phase (TC-CONSENT-002, TC-CONSENT-003)

A test **passes** when:
1. Screening validate returns HTTP 200
2. Request form returns `ref_code`
3. OTP verify returns Firebase custom token
4. Firebase sign-in and token refresh succeed
5. PIN creation returns `"Create PIN successfully"`
6. Profile returns `is_consent_accepted: true`
7. DB confirms `consent_status = 'pending_review'` for the signed-up employee

A test **fails** if:
- Screening validate returns 400/404 (employee not found or identity mismatch)
- OTP verify returns 400 (wrong code — check `OTP` env var)
- Firebase token is expired (transient — re-run)
- Profile does not reflect completed consent
- DB `consent_status` is not `'pending_review'`

### State Isolation Check (TC-CONSENT-004)

A test **passes** when:
- DB query returns `consent_status = 'new'` for both EMPAPI-CONSENT-003 and EMPAPI-CONSENT-004

A test **fails** if:
- Any non-signed-up employee has a status other than `'new'`

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| `employee_profile` rows from a previous run remain in DB | 🔴 Import creates duplicates, causing constraint violations | `beforeAll` DB cleanup before import always runs |
| `afterAll` cleanup skipped on test failure | 🔴 Next run fails on import | `afterAll` runs unconditionally via Playwright lifecycle |
| Phone or email collision in signup request form | 🟡 409 on request form step | Generate fresh phone and email per test run |
| Firebase `TOKEN_EXPIRED` during signup | 🟡 Flaky test failure | Transient — re-run the test |
| Company 514 missing `digital_consent` addon | 🔴 Screening validate returns 400 | Verify addon is enabled in DEV environment before running |
| Excel column headers don't match mapping config | 🔴 Import preview shows 0 rows | Column headers in fixture must exactly match: `"Employee ID"`, `"National ID"`, `"Passport No"` |
| TC-CONSENT-002 or TC-CONSENT-003 leaves a signed-up user | 🟡 Phone/email unique constraint on re-run | `afterEach` deletes user via admin API |

## Execution

```bash
# Run all Digital Consent tests
npm run test:api -- api/tests/digital-consent/digital-consent.test.ts

# Run a single test by name
npm run test:api -- api/tests/digital-consent/digital-consent.test.ts --grep "TC-CONSENT-002"
```

Tests run serially (`test.describe.configure({ mode: 'serial' })`).  
Expected total time: 60–90 seconds.

## Dependencies

- Company 514 must exist in DEV with `digital_consent` addon enabled
- `FIREBASE_API_KEY_DEV` must be set in `.env`
- `OTP` and `PINCODE` must be set in `.env`
- Admin credentials (`ADMIN_EMAIL_DEV`, `ADMIN_PASSWORD_DEV`) must be valid
- `api/fixtures/digital-consent-import.xlsx` must contain the 4 test rows (see [test-data.md](./test-data.md))
