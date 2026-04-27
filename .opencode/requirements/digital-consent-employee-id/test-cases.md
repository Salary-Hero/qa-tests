# Digital Consent Employee ID Only — Test Cases

## TC-CONSENT-EID-001 · Import — verify all 4 records created with consent_status = new

| Field | Value |
|---|---|
| ID | TC-CONSENT-EID-001 |
| Tags | `@smoke @guardian` |
| Depends on | `beforeAll` import pipeline |

**Steps:**
1. Query `employee_profile` for `TEST_EMPLOYEE_IDS` in `COMPANY_ID`

**Expected result:**
- 4 rows returned
- All rows have `consent_status = 'new'`

---

## TC-CONSENT-EID-002 · Signup with national_id — consent_status check

| Field | Value |
|---|---|
| ID | TC-CONSENT-EID-002 |
| Tags | `@guardian` |
| Employee | `EMPAPI-CONSENT-EID-001` |

**Steps:**
1. `validateScreeningEmployee(employeeId, companyId)` — confirms employee exists
2. `submitConsentEmployeeIdOnlyRequestForm(employeeId, nationalId, 'national_id', ...)` → `ref_code`
3. `verifyConsentOtp(ref_code, phone)` → `firebaseCustomToken`
3. `firebaseSignIn(firebaseCustomToken)` → `refreshToken`
4. `firebaseRefreshToken(refreshToken)` → `idTokenPrePin`
5. `createPin(idTokenPrePin)`
6. `firebaseRefreshToken(refreshToken)` → `idTokenPostPin`
7. `getProfile(idTokenPostPin)`

**Expected result:**
- `profile.has_pincode = true`
- `employee_profile.consent_status` in `['pending_review', 'new']`

---

## TC-CONSENT-EID-003 · Signup with passport_no — consent_status check

| Field | Value |
|---|---|
| ID | TC-CONSENT-EID-003 |
| Tags | `@guardian` |
| Employee | `EMPAPI-CONSENT-EID-002` |

**Steps:**
1. `validateScreeningEmployee(employeeId, companyId)` — confirms employee exists
2. `submitConsentEmployeeIdOnlyRequestForm(employeeId, passportNo, 'passport_no', ...)` → `ref_code`
3–8. Same as TC-CONSENT-EID-002.

**Expected result:**
- `profile.has_pincode = true`
- `employee_profile.consent_status` in `['pending_review', 'new']`

---

## TC-CONSENT-EID-004 · Non-signed-up employees unaffected — consent_status = new

| Field | Value |
|---|---|
| ID | TC-CONSENT-EID-004 |
| Tags | `@guardian` |
| Employees checked | `EMPAPI-CONSENT-EID-003`, `EMPAPI-CONSENT-EID-004` |

**Steps:**
1. Query `employee_profile` for `EMPAPI-CONSENT-EID-003` and `EMPAPI-CONSENT-EID-004`

**Expected result:**
- 2 rows returned
- Both rows have `consent_status = 'new'`
