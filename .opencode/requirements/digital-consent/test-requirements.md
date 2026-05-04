# Digital Consent — Test Requirements

## Objectives

1. Verify the 7-step admin import pipeline successfully creates consent placeholder records in the database
2. Confirm imported records have `consent_status = 'new'` before any signup occurs
3. Validate that a user can complete the full Digital Consent signup flow using a **national ID** as their identity
4. Validate that a user can complete the full Digital Consent signup flow using a **passport number** as their identity
5. Confirm that employees who have not signed up remain at `consent_status = 'new'` — import does not affect non-participating records
6. Verify the 7-step approval import pipeline transitions an employee from `pending_review` to `approved` and sets `users.status` correctly
7. Validate the approval flow for an employee who signed up with **national_id** — `users.status` set to `'active'`
8. Validate the approval flow for an employee who signed up with **passport_no** — `users.status` set to `'inactive'`
9. Ensure the test suite is fully repeatable — cleanup removes all test data so re-runs are safe

## Audience

This document is intended for QA engineers, backend developers, and product managers who need to understand what is being tested and why.

## Scope

### In Scope ✅

- 7-step admin screening import pipeline (upload Excel → configure → map → preview → validate → import)
- `employee_profile` DB state after import (`consent_status = 'new'`)
- Consent signup using `personal_id_type: "national_id"`
- Consent signup using `personal_id_type: "passport_no"`
- Firebase token exchange as part of signup
- PIN creation and profile verification post-signup
- `employee_profile` DB state after signup (`consent_status = 'pending_review'`)
- State isolation — non-signed-up employees unaffected by signup activity
- 7-step approval import pipeline (upload approval Excel → configure → map → preview → validate → import)
- `employee_profile.consent_status = 'approved'` after approval
- `users.status` set to value from `Status` column in approval xlsx (`'active'` or `'inactive'`)
- Approval validation rules: phone match, identity match, bank account uniqueness
- Full cleanup and test repeatability

### Out of Scope ❌

- `update_action` and `delete_action` import modes (only `create_action: true` tested for screening)
- Import validation errors (wrong column headers, missing fields, duplicate data)
- Admin approval rejection flow (`consent_status = 'rejected'`)
- Admin manual status transitions (`pending_review → disabled`, `pending_review → pending_update`)
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
6. Profile returns `employee_profile.consent_status` of `pending_review` or `new`
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

### Approval Phase (TC-CONSENT-005, TC-CONSENT-006)

A test **passes** when:
1. Full signup completes successfully (same criteria as signup phase above)
2. All 7 approval import steps return HTTP 200
3. Step 19 preview response has `approve_num_row > 0`
4. Steps 20 and 21 return `{ "message": "success" }`
5. DB confirms `employee_profile.consent_status = 'approved'`
6. DB confirms `users.status` matches the `Status` column value in the approval xlsx

A test **fails** if:
- Signup phase fails at any step
- `approve_num_row = 0` (phone mismatch, identity mismatch, duplicate bank account, or employee not in `pending_review`)
- `consent_status` is not `'approved'` after import
- `users.status` does not match the expected value from the approval xlsx `Status` column

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| `employee_profile` rows from a previous run remain in DB | 🔴 Import creates duplicates, causing constraint violations | `beforeAll` DB cleanup before import always runs |
| `afterAll` cleanup skipped on test failure | 🔴 Next run fails on import | `afterAll` runs unconditionally via Playwright lifecycle |
| Phone or email collision in signup request form | 🟡 409 on request form step | Generate fresh phone and email per test run |
| Firebase `TOKEN_EXPIRED` during signup | 🟡 Flaky test failure | Transient — re-run the test |
| Company 514 missing `digital_consent` addon | 🔴 Screening validate returns 400 | Verify addon is enabled in DEV environment before running |
| Excel column headers don't match mapping config | 🔴 Import preview shows 0 rows | Column headers in screening fixture must match: `"Employee ID"`, `"National ID"`, `"Passport No"` |
| TC-CONSENT-002 or TC-CONSENT-003 leaves a signed-up user | 🟡 Phone/email unique constraint on re-run | `afterEach` hard-deletes user and resets `employee_profile` row |
| Approval import `approve_num_row = 0` due to phone mismatch | 🔴 TC-CONSENT-005 or TC-CONSENT-006 fails | `phone` generated during signup is passed as override to `importDigitalConsentApprovalData` |
| Approval import `approve_num_row = 0` due to duplicate `account_no` | 🔴 TC-CONSENT-005 or TC-CONSENT-006 fails | `account_no` is generated fresh per test run via `generateAccountNo()` |
| `users.status` assertion wrong after approval | 🟡 Test fails if `Status` column in fixture doesn't match assertion | Fixture `Status` column and test assertion must be kept in sync |

## Execution

```bash
# Run all Digital Consent tests
yarn test:api api/tests/digital-consent/digital-consent.test.ts

# Run a single test by name
yarn test:api api/tests/digital-consent/digital-consent.test.ts --grep "TC-CONSENT-005"
```

Tests run serially (`test.describe.configure({ mode: 'serial' })`).
Expected total time: 90–120 seconds (includes approval import processing time).

## Dependencies

- Company 514 must exist in DEV with `digital_consent` addon enabled
- `FIREBASE_API_KEY_DEV` must be set in `.env`
- `OTP` and `PINCODE` must be set in `.env`
- Admin credentials (`ADMIN_EMAIL_DEV`, `ADMIN_PASSWORD_DEV`) must be valid
- `api/fixtures/digital-consent-import.xlsx` must contain the 4 screening test rows
- `api/fixtures/digital-consent-import-approval.xlsx` must contain the 2 approval test rows
