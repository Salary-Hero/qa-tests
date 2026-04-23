# Digital Consent — Test Cases

Test file: `api/tests/digital-consent/digital-consent.test.ts`
Run: `npm run test:api -- api/tests/digital-consent/digital-consent.test.ts`

All tests run serially. Import (`beforeAll`) runs once before all signup tests.

---

## beforeAll — Import Setup

Runs once before all 4 test cases.

| Action | Detail |
|--------|--------|
| DB cleanup | `DELETE FROM employee_profile WHERE employee_id IN ('TS01900','TS01901','TS01902','TS01903') AND company_id = 514` |
| Admin login | Get Bearer token via `getAdminToken(request)` |
| Run import | Execute 7-step import pipeline (see TC-CONSENT-001 steps) |

## afterAll — Cleanup

Runs once after all 4 test cases, regardless of pass/fail.

| Action | Detail |
|--------|--------|
| DB cleanup | `DELETE FROM employee_profile WHERE employee_id IN ('TS01900','TS01901','TS01902','TS01903') AND company_id = 514` |

---

## TC-CONSENT-001 · Import Consent Data

**Priority:** Critical | **Status:** 🔲 NEW

**Objective:** Verify the 7-step admin import pipeline creates 4 consent placeholder records with `consent_status = 'new'`.

**Preconditions:**
- `beforeAll` DB cleanup has run
- Admin token obtained
- `api/fixtures/digital-consent-import.xlsx` exists with correct headers and 4 data rows

**Steps:**

| Step | Action | Assert |
|------|--------|--------|
| 1 | `POST /v1/admin/account/screening-import/jobs` (multipart: `company_id=514`, `file`) | 200 · `job_id` defined · `import_type = "consent"` · `status = "configure"` |
| 2 | `PUT /jobs/{job_id}` — `{ create_action: true, identifier: "employee_id", update_columns: ["national_id","passport_no"] }` | 200 · `config.create_action = true` |
| 3 | `PUT /screening-import/514/mapping` — map 3 column headers | 200 · all 3 field mappings returned |
| 4 | `PUT /jobs/{job_id}` — `{ create_action: true, update_columns: [] }` | 200 |
| 5 | `POST /jobs/{job_id}/preview` | 200 · `status = "preview"` · `create_num_row = 4` · all 4 employee_ids in `create_rows` |
| 6 | `POST /jobs/{job_id}/validate` | 200 · `message = "success"` |
| 7 | `POST /jobs/{job_id}/import` | 200 · `message = "success"` |
| 8 | DB: `SELECT consent_status FROM employee_profile WHERE employee_id IN (...) AND company_id = 514` | 4 rows returned · all have `consent_status = 'new'` |

**Fails if:**
- Any step returns non-200
- Preview `create_num_row ≠ 4` (column header mismatch or missing rows in Excel)
- DB rows missing or have wrong `consent_status`

---

## TC-CONSENT-002 · Signup with National ID

**Priority:** Critical | **Status:** 🔲 NEW | **Employee:** TS01900

**Objective:** Verify a user can complete Digital Consent signup using `national_id` as their identity, and `consent_status` transitions to `'pending_review'`.

**Preconditions:**
- TC-CONSENT-001 has run — TS01900 row exists with `consent_status = 'new'`
- Fresh `phone` and `email` generated for this test
- `OTP` and `PINCODE` set in `.env`
- Firebase API key configured

**Steps:**

| Step | Action | Assert |
|------|--------|--------|
| 8 | `POST /v2/public/account/consent/screening/validate` `{ employee_id: "TS01900", personal_id: "2001000099000", personal_id_type: "national_id", company_id: 514 }` | 200 |
| 9 | `POST /v2/public/account/consent/request-form/request` `{ personal_id_type: "national_id", company_id: 514, screening: { employee_id: "TS01900", personal_id: "2001000099000" }, request_form: { first_name: "QA", last_name: "Consent", email: generated, phone: generated } }` | 200 · `verification.ref_code` defined |
| 10 | `POST /v1/public/account/consent/request-form/verify` `{ ref_code, code: OTP, phone }` | 200 · `verification_info.token` starts with `"ey"` |
| 11 | Firebase `signInWithCustomToken(token)` | 200 · `refreshToken` returned |
| 12 | Firebase `securetoken/v1/token` (pre-PIN) `{ grant_type: "refresh_token", refresh_token }` | 200 · `id_token` returned |
| 13 | `POST /v1/user/account/profile/pincode/create` `{ pincode }` | 200 · `message = "Create PIN successfully"` |
| 14 | Firebase `securetoken/v1/token` (post-PIN) | 200 · new `id_token` returned |
| 15 | `GET /v1/user/account/profile` | 200 · `profile.is_consent_accepted = true` · `profile.has_pincode = true` |
| DB | `SELECT consent_status FROM employee_profile WHERE employee_id = 'TS01900' AND company_id = 514` | `consent_status = 'pending_review'` |

**afterEach:**
```
DELETE /v1/admin/account/employee/{user_id}
```

**Fails if:**
- Step 8 returns 404 — TS01900 not in `employee_profile` (import did not run or `beforeAll` cleanup removed it)
- Step 9 returns 400 — `personal_id` doesn't match
- Step 10 returns 400 — wrong OTP (check `OTP` env var, DEV = `"111111"`)
- Firebase token expired (transient — re-run)
- DB `consent_status ≠ 'pending_review'`

---

## TC-CONSENT-003 · Signup with Passport Number

**Priority:** High | **Status:** 🔲 NEW | **Employee:** TS01901

**Objective:** Verify a user can complete Digital Consent signup using `passport_no` as their identity.

**Preconditions:** Same as TC-CONSENT-002. TC-CONSENT-001 must have run.

**Steps:**

Identical to TC-CONSENT-002 with these differences:

| Field | TC-CONSENT-002 | TC-CONSENT-003 |
|-------|----------------|----------------|
| `employee_id` | `"TS01900"` | `"TS01901"` |
| `personal_id_type` | `"national_id"` | `"passport_no"` |
| `personal_id` | `"2001000099000"` | `"TSPP1901"` |
| `phone` | fresh generated | fresh generated (different value) |
| `email` | fresh generated | fresh generated (different value) |

All 8 steps and DB assertion are otherwise identical. `consent_status` must be `'pending_review'` for TS01901 after signup.

**afterEach:**
```
DELETE /v1/admin/account/employee/{user_id}
```

**Fails if:**
- Step 8 returns 404 — passport identity not matched (check `TSPP1901` matches Excel fixture)
- `personal_id_type = "passport_no"` not accepted — backend may not support this value

---

## TC-CONSENT-004 · Non-Signed-Up Employees Remain 'new'

**Priority:** High | **Status:** 🔲 NEW | **Employees:** TS01902, TS01903

**Objective:** Verify that employees who were imported but never signed up retain `consent_status = 'new'`. This ensures the signup of other employees does not affect unrelated records.

**Preconditions:**
- TC-CONSENT-001 has run — TS01902 and TS01903 rows exist
- TC-CONSENT-002 and TC-CONSENT-003 have run — TS01900 and TS01901 are now `'pending_review'`
- No signup has been performed for TS01902 or TS01903

**Steps:**

| Step | Action | Assert |
|------|--------|--------|
| DB | `SELECT employee_id, consent_status FROM employee_profile WHERE employee_id IN ('TS01902', 'TS01903') AND company_id = 514 AND deleted_at IS NULL` | 2 rows returned · both have `consent_status = 'new'` |

No API calls. No data created or modified.

**Fails if:**
- Fewer than 2 rows returned (import did not create these records)
- Any row has `consent_status ≠ 'new'` (unintended side effect from TC-002 or TC-003)

---

## Test Execution Order

```
beforeAll   → DB cleanup → Admin login → 7-step import
TC-CONSENT-001 → verify 4 × 'new'
TC-CONSENT-002 → signup TS01900 (national_id) → verify 'pending_review' → afterEach: delete user
TC-CONSENT-003 → signup TS01901 (passport_no) → verify 'pending_review' → afterEach: delete user
TC-CONSENT-004 → DB check TS01902, TS01903 still 'new'
afterAll    → DB cleanup
```
