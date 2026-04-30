# Digital Consent Employee ID Only — Test Requirements

## Objectives

1. Verify the 7-step screening import creates `employee_profile` records with `consent_status = 'new'` and `users.status = 'inactive'`
2. Verify an employee can sign up using `employee_id + national_id` — full flow (OTP → Firebase → PIN → profile)
3. Verify an employee can sign up using `employee_id + passport_no` — full flow
4. Verify that employees who have not signed up retain `consent_status = 'new'` after other employees complete signup
5. Verify the 7-step approval import transitions `consent_status` from `pending_review` → `approved` and `users.status` from `inactive` → `active`
6. Verify the approval import rejects a row when the identity fields (phone + national_id or passport_no) in the approval xlsx do not match the employee's submitted consent request form
7. Verify the approval import rejects a row when the bank account number already exists in the system

## Scope

### In Scope ✅

**Screening import pipeline (steps 1–7):**
- `POST /api/v1/admin/account/screening-import/jobs` — create job
- `PUT /api/v1/admin/account/screening-import/jobs/:jobId` — configure
- `PUT /api/v1/admin/account/screening-import/:companyId/mapping` — column mapping
- `POST /api/v1/admin/account/screening-import/jobs/:jobId/preview`
- `POST /api/v1/admin/account/screening-import/jobs/:jobId/validate`
- `POST /api/v1/admin/account/screening-import/jobs/:jobId/import`

**Employee signup flow (steps 8–14):**
- `POST /api/v2/public/account/consent/screening/validate` — employee existence check
- `POST /api/v2/public/account/consent/request-form/request` — submit consent form
- `POST /api/v1/public/account/consent/request-form/verify` — OTP verification
- Firebase sign-in + token refresh
- `POST /api/v1/user/account/profile/pincode/create` — PIN creation
- `GET /api/v1/user/account/profile` — profile verification

**Approval import pipeline (steps 15–21):**
- `POST /api/v3/admin/account/employee-import/jobs` — create approval job
- `PUT /api/v3/admin/account/employee-import/jobs/:jobId` — configure with `approve_action: true`
- `PUT /api/v3/admin/account/employee-import/:companyId/mapping` — full column mapping
- `POST /api/v3/admin/account/employee-import/jobs/:jobId/preview`
- `POST /api/v3/admin/account/employee-import/jobs/:jobId/validate`
- `POST /api/v3/admin/account/employee-import/jobs/:jobId/import`

### Out of Scope ❌

- Rejection flow (low priority — HR manually rejects a user)
- Request change / pending_update flow (low priority)
- Email notifications
- UI / frontend
- Withdraw / EWA service after approval

## Pass/Fail Criteria

A test **passes** when all of the following are true:
1. API returns the expected HTTP status code at every step
2. Response body contains all required fields with correct types
3. DB state matches expected values after each major step
4. Cleanup completes without error

A test **fails** if any of the following occur:
- Any import step returns a non-2xx status
- `preview.create_num_row = 0` (screening) or `preview.approve_num_row = 0` (approval) — indicates file upload or eligibility problem
- `consent_status` does not match expected value after import or signup
- `users.status` does not transition to `active` after approval import
- Identity mismatch or duplicate bank account does not cause row rejection
- Signed-up user is not cleaned up between tests, causing 409 collisions

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Approval import runs on employee with `consent_status ≠ pending_review` | 🔴 `approve_num_row = 0`, import has no effect | Test asserts `pending_review` before running approval import |
| Previous test run left a signed-up user with `pending_review` status | 🔴 409 collision on signup step | `beforeAll` runs `cleanupConsentEidSignedUpUsers()` + `deleteEmployeeProfileRecords()` |
| Approval xlsx column headers differ from mapping config | 🔴 Import fails or maps wrong columns | Fixture file column headers must exactly match the mapping in step 17 |
| `users.status` not updated after approval (backend regression) | 🔴 Assertion fails | TC-CONSENT-EID-005 asserts both `consent_status` and `users.status` |
| Approval xlsx identity fields don't match submitted consent form | 🔴 Row rejected, `approve_num_row = 0` | Fixture approval xlsx must contain the exact same phone and identity values used during signup (TC-CONSENT-EID-005 uses fixed fixture data, not generated values) |
| Approval xlsx has duplicate bank account number | 🔴 Row rejected, `approve_num_row = 0` | Fixture `account_no` values must be unique across the environment — avoid reusing account numbers from other active test employees |
| Concurrent import jobs on the same company conflict | 🟡 Import may fail or affect wrong records | Tests run serially (`test.describe.configure({ mode: 'serial' })`) |
| `approve_num_row` includes employees from other test runs | 🟡 Import approves unintended users | Fixture employees use unique IDs scoped to this test (`EMPAPI-CONSENT-EID-*`) |

## Execution

```bash
yarn test:api -- --grep "Digital Consent — Employee ID Only"
```

Tests run serially (`test.describe.configure({ mode: 'serial' })`).
