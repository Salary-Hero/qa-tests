# Digital Consent Employee ID Only — Test Cases

Test file: `api/tests/digital-consent/digital-consent.test.ts`
Run: `yarn test:api --grep "Digital Consent — Employee ID Only"`

---

## TC-CONSENT-EID-001 · Import — all 4 records created with consent_status = new

**Priority:** High | **Status:** ✅ PASS
**Tags:** `@component` `@high` `@smoke` `@regression` `@guardian`

**Preconditions:** `beforeAll` has run the 7-step screening import pipeline successfully.

**Steps:**
1. Query `employee_profile` for all 4 `EMPAPI-CONSENT-EID-*` employee IDs in `CONSENT_EID_COMPANY_ID`

**Pass when:**
```
rows.length = 4
All rows: consent_status = 'new'
```

**Fails if:** Import did not run, rows are missing, or any row has wrong `consent_status`.

---

## TC-CONSENT-EID-002 · Signup with national_id — consent_status check

**Priority:** High | **Status:** ✅ PASS
**Tags:** `@component` `@high` `@regression` `@guardian`

**Preconditions:** `EMPAPI-CONSENT-EID-001` exists in `employee_profile` with `consent_status = 'new'`.

**Steps:**
1. `validateScreeningEmployee(employeeId, companyId)` — confirm employee exists
2. `submitConsentEmployeeIdOnlyRequestForm(employeeId, nationalId, 'national_id', companyId, phone, email)` → `ref_code`
3. `verifyConsentOtp(ref_code, phone)` → `firebaseCustomToken`
4. `firebaseSignIn(firebaseCustomToken)` → `refreshToken`
5. `firebaseRefreshToken(refreshToken)` → `idTokenPrePin`
6. `createPin(idTokenPrePin)`
7. `firebaseRefreshToken(refreshToken)` → `idTokenPostPin`
8. `getProfile(idTokenPostPin)` → assert `has_pincode = true`, `consent_status` in `['pending_review', 'new']`
9. Capture `signedUpUserId` for `afterEach` cleanup
10. `logout(idTokenPostPin)`

**Pass when:**
```
profile.has_pincode = true
employee_profile.consent_status in ['pending_review', 'new']
```

**Fails if:** OTP fails, Firebase sign-in fails, PIN creation fails, `consent_status` unexpectedly wrong.

**Teardown:** `afterEach` runs `hardDeleteEmployee(signedUpUserId)`.

---

## TC-CONSENT-EID-003 · Signup with passport_no — consent_status check

**Priority:** High | **Status:** ✅ PASS
**Tags:** `@component` `@high` `@regression` `@guardian`

**Preconditions:** `EMPAPI-CONSENT-EID-002` exists in `employee_profile` with `consent_status = 'new'`.

**Steps:**
1. `validateScreeningEmployee(employeeId, companyId)` — confirm employee exists
2. `submitConsentEmployeeIdOnlyRequestForm(employeeId, passportNo, 'passport_no', companyId, phone, email)` → `ref_code`
3–10. Same as TC-CONSENT-EID-002 from step 3 onwards.

**Pass when:**
```
profile.has_pincode = true
employee_profile.consent_status in ['pending_review', 'new']
```

**Teardown:** `afterEach` runs `hardDeleteEmployee(signedUpUserId)`.

---

## TC-CONSENT-EID-004 · Non-signed-up employees unaffected — consent_status = new

**Priority:** High | **Status:** ✅ PASS
**Tags:** `@component` `@high` `@regression` `@guardian`

**Preconditions:** TC-CONSENT-EID-002 and TC-CONSENT-EID-003 have run. `EMPAPI-CONSENT-EID-003` and `EMPAPI-CONSENT-EID-004` have not been used in any signup.

**Steps:**
1. Query `employee_profile` for `EMPAPI-CONSENT-EID-003` and `EMPAPI-CONSENT-EID-004`

**Pass when:**
```
rows.length = 2
All rows: consent_status = 'new'
```

**Fails if:** Any non-signed-up employee's `consent_status` was modified by another test.

---

## TC-CONSENT-EID-005 · Full approve flow — consent_status = approved, status = active

**Priority:** High | **Status:** 🔲 PLANNED
**Tags:** `@component` `@high` `@regression` `@guardian`

**Preconditions:**
- `EMPAPI-CONSENT-EID-001` exists in `employee_profile` with `consent_status = 'new'`
- Approval fixture file exists at `api/fixtures/digital-consent-employee-id-import-approval.xlsx`
- Admin token obtained in `beforeAll`

**Steps:**
1. `validateScreeningEmployee('EMPAPI-CONSENT-EID-001', companyId)` — confirm employee exists
2. `submitConsentEmployeeIdOnlyRequestForm(employeeId, nationalId, 'national_id', companyId, phone, email)` → `ref_code`
3. `verifyConsentOtp(ref_code, phone)` → `firebaseCustomToken`
4. `firebaseSignIn(firebaseCustomToken)` → `refreshToken`
5. `firebaseRefreshToken(refreshToken)` → `idTokenPrePin`
6. `createPin(idTokenPrePin)`
7. `firebaseRefreshToken(refreshToken)` → `idTokenPostPin`
8. `getProfile(idTokenPostPin)` → assert `has_pincode = true`, `consent_status` in `['pending_review', 'new']`
9. Capture `signedUpUserId` for `afterEach` cleanup
10. `logout(idTokenPostPin)`
11. Run 7-step approval import: `importDigitalConsentEmployeeIdApprovalData(request, adminToken)`
12. Wait 3 seconds for backend processing
13. DB: `getEmployeeProfiles(['EMPAPI-CONSENT-EID-001'], companyId)` → assert `consent_status = 'approved'`
14. DB: `getUserById(signedUpUserId)` → assert `status = 'active'`

**Pass when:**
```
After signup (step 8):
  profile.has_pincode = true
  employee_profile.consent_status in ['pending_review', 'new']
  users.status = 'inactive'

After approval import (steps 11–14):
  employee_profile.consent_status = 'approved'
  users.status = 'active'
```

**Fails if:**
- Signup fails at any step
- `approve_num_row = 0` because employee is not in `pending_review` (previous cleanup may have failed)
- `approve_num_row = 0` because phone or identity in approval xlsx doesn't match the submitted consent form
- `approve_num_row = 0` because bank `account_no` already exists in the system
- `consent_status` is not `'approved'` after import
- `users.status` is not `'active'` after import

**Teardown:** `afterEach` runs `hardDeleteEmployee(signedUpUserId)`.

**Note:** This test uses `EMPAPI-CONSENT-EID-001` — same employee as TC-CONSENT-EID-002. Since tests run serially and `afterEach` hard-deletes the signed-up user between tests, the screening import in `beforeAll` creates a fresh `employee_profile` for `EMPAPI-CONSENT-EID-001` at the start of the suite. TC-CONSENT-EID-005 relies on this fresh state.

---

## Negative Test Cases (Planned)

These cases verify that the approval import correctly rejects rows that violate the validation rules documented in `api-contract.md`.

All negative tests still require all four mandatory tags and full `test.step()` wrapping.

---

## TC-CONSENT-EID-NEG-001 · Approval import — identity mismatch rejected

**Priority:** High | **Status:** 🔲 PLANNED
**Tags:** `@component` `@high` `@regression` `@guardian`

**Preconditions:**
- `EMPAPI-CONSENT-EID-001` exists in `employee_profile` with `consent_status = 'new'`
- Admin token obtained

**Steps:**
1. Complete full signup flow for `EMPAPI-CONSENT-EID-001` using `national_id = A` (generated value)
2. Assert signup succeeds — `consent_status in ['pending_review', 'new']`
3. Run approval import with an approval xlsx that contains `national_id = B` (a different, wrong value) for `EMPAPI-CONSENT-EID-001`
4. Assert `preview.approve_num_row = 0` — the row must be rejected
5. DB: `getEmployeeProfiles(['EMPAPI-CONSENT-EID-001'], companyId)` → assert `consent_status` is still `'pending_review'` (not changed to `'approved'`)

**Pass when:**
```
preview.approve_num_row = 0
employee_profile.consent_status = 'pending_review'  (unchanged)
users.status = 'inactive'  (unchanged)
```

**Fails if:** Import accepts the row despite identity mismatch — `approve_num_row > 0` or `consent_status` changes to `'approved'`.

**Teardown:** `hardDeleteEmployee(signedUpUserId)`.

---

## TC-CONSENT-EID-NEG-002 · Approval import — duplicate bank account rejected

**Priority:** High | **Status:** 🔲 PLANNED
**Tags:** `@component` `@high` `@regression` `@guardian`

**Preconditions:**
- `EMPAPI-CONSENT-EID-001` exists in `employee_profile` with `consent_status = 'new'`
- Another active employee in the system already holds the `account_no` that will be used in the approval xlsx (can be an existing fixture employee or a separately created one)
- Admin token obtained

**Steps:**
1. Complete full signup flow for `EMPAPI-CONSENT-EID-001` (phone and identity matching the approval xlsx)
2. Assert signup succeeds — `consent_status in ['pending_review', 'new']`
3. Run approval import with an approval xlsx that contains an `account_no` already used by another employee in the system
4. Assert `preview.approve_num_row = 0` — the row must be rejected due to duplicate bank account
5. DB: assert `consent_status` is still `'pending_review'` (not `'approved'`)

**Pass when:**
```
preview.approve_num_row = 0
employee_profile.consent_status = 'pending_review'  (unchanged)
users.status = 'inactive'  (unchanged)
```

**Fails if:** Import accepts the row despite duplicate bank account — `approve_num_row > 0` or `consent_status` changes to `'approved'`.

**Teardown:** `hardDeleteEmployee(signedUpUserId)`. Clean up the pre-existing duplicate account employee if it was created specifically for this test.

**Implementation note:** The easiest setup is to use the `account_no` from the standard approval fixture (already known to exist after TC-CONSENT-EID-005 runs), then run a second approval attempt with the same `account_no`. However, if TC-CONSENT-EID-005 runs `hardDeleteEmployee` on the approved user, the bank record is also removed. A separate pre-existing employee fixture may be more reliable.
