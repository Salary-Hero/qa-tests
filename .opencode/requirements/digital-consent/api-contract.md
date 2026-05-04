# Digital Consent — API Contract

Base URL: `https://apiv2-{ENV}.salary-hero.com/api`

---

## Phase 1 — Admin Import Pipeline (Steps 1–7)

All import endpoints require: `Authorization: Bearer {adminToken}`

See [shared/authentication.md](../shared/authentication.md) for how to obtain the admin token.

---

### Step 1 — Create Import Job

**`POST /v1/admin/account/screening-import/jobs`**

**Body:** `multipart/form-data`

| Field | Value |
|-------|-------|
| `company_id` | `514` |
| `is_include_child_company` | `"false"` |
| `file` | `.xlsx` file attachment |

**Response (200):**
```json
{
  "job_id": "4679",
  "company_id": 514,
  "status": "configure",
  "import_type": "consent",
  "config": {
    "create_action": false,
    "update_action": false,
    "delete_action": false,
    "identifier": "employee_id",
    "update_columns": []
  }
}
```

**Key assertions:** `job_id` exists · `import_type = "consent"` · `status = "configure"`

**Note:** Capture `job_id` from this response — required for all subsequent import steps.

---

### Step 2 — Configure Import

**`PUT /v1/admin/account/screening-import/jobs/{job_id}`**

**Body:**
```json
{
  "config": {
    "create_action": true,
    "update_action": false,
    "delete_action": false,
    "identifier": "employee_id",
    "update_columns": ["national_id", "passport_no"],
    "include_company_ids": []
  }
}
```

**Response (200):**
```json
{
  "job_id": "4679",
  "company_id": 514,
  "status": "configure",
  "config": {
    "create_action": true,
    "update_action": false,
    "delete_action": false,
    "identifier": "employee_id",
    "update_columns": ["national_id", "passport_no"]
  }
}
```

**Key assertion:** `config.create_action = true`

---

### Step 3 — Map Excel Columns

**`PUT /v1/admin/account/screening-import/{company_id}/mapping`**

Maps internal API field names to the column headers in the Excel file.

**Body:**
```json
{
  "data": {
    "employee_id": "Employee ID",
    "national_id": "National ID",
    "passport_no": "Passport No"
  },
  "update_columns": [],
  "company_column_name": null,
  "company_mapping": {}
}
```

**Response (200):**
```json
{
  "id": "107",
  "company_id": 514,
  "mapping": {
    "employee_id": "Employee ID",
    "national_id": "National ID",
    "passport_no": "Passport No"
  },
  "update_columns": []
}
```

**Key assertion:** All 3 field mappings present in response.

**Note:** Excel column headers must exactly match the string values in this mapping (`"Employee ID"`, `"National ID"`, `"Passport No"`).

---

### Step 4 — Re-confirm Config After Mapping

**`PUT /v1/admin/account/screening-import/jobs/{job_id}`**

Same endpoint as Step 2. Called again after column mapping to finalise the config with empty `update_columns`.

**Body:**
```json
{
  "config": {
    "create_action": true,
    "update_action": false,
    "delete_action": false,
    "identifier": "employee_id",
    "update_columns": [],
    "include_company_ids": []
  }
}
```

**Response (200):** Same structure as Step 2.

---

### Step 5 — Generate Preview

**`POST /v1/admin/account/screening-import/jobs/{job_id}/preview`**

**Body:** None

**Response (200):**
```json
{
  "job_id": "4679",
  "company_id": 514,
  "status": "preview",
  "config": { "..." },
  "preview": {
    "create_rows": [
      { "employee_id": "EMPAPI-CONSENT-001", "national_id": 2001000099000, "passport_no": "TSPP1900", "company_id": 514 },
      { "employee_id": "EMPAPI-CONSENT-002", "national_id": 2001000099001, "passport_no": "TSPP1901", "company_id": 514 },
      { "employee_id": "EMPAPI-CONSENT-003", "national_id": 2001000099002, "passport_no": "TSPP1902", "company_id": 514 },
      { "employee_id": "EMPAPI-CONSENT-004", "national_id": 2001000099003, "passport_no": "TSPP1903", "company_id": 514 }
    ],
    "update_rows": [],
    "delete_rows": [],
    "create_num_row": 4,
    "update_num_row": 0,
    "delete_num_row": 0
  }
}
```

**Key assertions:** `status = "preview"` · `create_num_row = 4` · all 4 `employee_id` values present in `create_rows`

---

### Step 6 — Validate Import

**`POST /v1/admin/account/screening-import/jobs/{job_id}/validate`**

**Body:** None

**Response (200):**
```json
{ "message": "success" }
```

---

### Step 7 — Confirm Import

**`POST /v1/admin/account/screening-import/jobs/{job_id}/import`**

**Body:** None

**Response (200):**
```json
{ "message": "success" }
```

**After this step:** 4 rows exist in `employee_profile` with `consent_status = 'new'`.

---

## Phase 2 — Consent Signup Flow (Steps 8–15)

Steps 8–10 are consent-specific public endpoints. Steps 11–14 use Firebase (same as all other signup flows). Steps 13 and 15 reuse existing shared endpoints.

---

### Step 8 — Validate Screening Identity

**`POST /v2/public/account/consent/screening/validate`**

**Headers:** `Content-Type: application/json`

**Request:**
```json
{
  "employee_id": "EMPAPI-CONSENT-001",
  "personal_id": "2001000099000",
  "personal_id_type": "national_id",
  "company_id": 514
}
```

For passport signup, use:
```json
{
  "employee_id": "EMPAPI-CONSENT-002",
  "personal_id": "TSPP1901",
  "personal_id_type": "passport_no",
  "company_id": 514
}
```

**Status Codes:**
- `200` - Identity matched against imported consent record
- `400` - Invalid format or missing field
- `404` - `employee_id` not found or identity does not match

---

### Step 9 — Submit Consent Request Form

**`POST /v2/public/account/consent/request-form/request`**

**Request:**
```json
{
  "personal_id_type": "national_id",
  "company_id": 514,
  "screening": {
    "employee_id": "EMPAPI-CONSENT-001",
    "personal_id": "2001000099000"
  },
  "request_form": {
    "first_name": "QA",
    "last_name": "Consent",
    "email": "qa-signup-{timestamp}-{random}@test.example.com",
    "phone": "09{8-random-digits}"
  }
}
```

**Response (200):**
```json
{
  "verification": {
    "ref_code": "WwFTdG"
  }
}
```

**Key assertion:** `verification.ref_code` is a string · capture for Step 10.

**Note:** `email` and `phone` must be unique per run — generate fresh values.

---

### Step 10 — Verify OTP

**`POST /v1/public/account/consent/request-form/verify`**

**Request:**
```json
{
  "ref_code": "{ref_code from step 9}",
  "code": "111111",
  "phone": "{phone used in step 9}"
}
```

**Response (200):**
```json
{
  "verification_info": {
    "token": "eyJhbGci...",
    "profile": "...",
    "company": "..."
  }
}
```

**Key assertion:** `verification_info.token` starts with `"ey"` (Firebase custom token).

**Note:** `code` is read from `seedConfigForEnv.otp` (`111111` for DEV, `199119` for STAGING).

---

### Steps 11–14 — Firebase Auth (Shared Flow)

Identical to all other signup flows. See [shared/authentication.md](../shared/authentication.md).

| Step | Action | Returns |
|------|--------|---------|
| 11 | Firebase `signInWithCustomToken` | `refreshToken` |
| 12 | Firebase `securetoken/v1/token` (pre-PIN) | `id_token` |
| 13 | `POST /v1/user/account/profile/pincode/create` `{ pincode }` | `"Create PIN successfully"` |
| 14 | Firebase `securetoken/v1/token` (post-PIN) | `id_token` |

---

### Step 15 — Get Profile

**`GET /v1/user/account/profile`**

**Headers:** `Authorization: Bearer {id_token from step 14}`

**Response (200) — key fields:**
```json
{
  "profile": {
    "status": "inactive",
    "has_pincode": true
  },
  "employee_profile": {
    "consent_status": "pending_review"
  },
  "company": {
    "addons": [
      { "addon": "digital_consent", "is_enabled": true }
    ]
  }
}
```

**Key assertions:**
- `profile.has_pincode = true`
- `employee_profile.consent_status` is `pending_review` or `new` (`is_consent_accepted` is deprecated — do not use)

---

## DB Verification

Direct database queries used for verifying `employee_profile` state. No API endpoint exists for this.

```sql
-- After import (TC-CONSENT-001): expect 4 rows with consent_status = 'new'
SELECT employee_id, consent_status
FROM employee_profile
WHERE employee_id IN ('EMPAPI-CONSENT-001', 'EMPAPI-CONSENT-002', 'EMPAPI-CONSENT-003', 'EMPAPI-CONSENT-004')
  AND company_id = 514
  AND deleted_at IS NULL;

-- After signup (TC-CONSENT-002, TC-CONSENT-003): expect consent_status = 'pending_review'
SELECT consent_status
FROM employee_profile
WHERE employee_id = 'EMPAPI-CONSENT-001'
  AND company_id = 514
  AND deleted_at IS NULL;
```

---

## Error Response Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

**Common status codes:**
- `200` / `201` - Success
- `400` - Invalid request body
- `401` - Unauthorized
- `404` - Record not found
- `409` - Duplicate / unique constraint violation

---

## Phase 3 — Approval Import Pipeline (Steps 15–21)

All approval import endpoints require: `Authorization: Bearer {adminToken}`

The approval import processes employees who have `consent_status = 'pending_review'`. It validates that the identity and phone in the approval xlsx match the values submitted during the employee's consent request form signup. It also validates that the bank account number is globally unique.

`users.status` after approval is set to the value of the `Status` column in the approval xlsx — either `'active'` or `'inactive'`. This is determined by the HR/admin who prepares the approval file.

---

### Step 15 — Create Approval Import Job

**`POST /api/v3/admin/account/employee-import/jobs`**

**Body:** `multipart/form-data`

| Field | Value |
|-------|-------|
| `company_id` | `514` |
| `is_include_child_company` | `"false"` |
| `all_pay_cycle_ids` | `"true"` |
| `pay_cycle_ids[0]` | `"null"` |
| `pay_cycle_ids[1]` | paycycle ID for company (from `getCompany('digital_consent').qa_paycycle_id`) |
| `file` | approval `.xlsx` file attachment |

**Note:** This step must use native `fetch` (not Playwright `request` context) because Playwright's global `Content-Type: application/json` header conflicts with the `multipart/form-data` boundary.

**Response (200):**
```json
{
  "job_id": "4793",
  "company_id": 514,
  "status": "configure",
  "config": {
    "approve_action": false,
    "create_action": false,
    "update_action": false,
    "delete_action": false,
    "identifier": "employee_id",
    "update_columns": []
  }
}
```

**Key assertion:** `job_id` exists — capture for all subsequent approval import steps.

---

### Step 16 — Configure Approval Import

**`PUT /api/v3/admin/account/employee-import/jobs/{job_id}`**

**Body:**
```json
{
  "config": {
    "approve_action": true,
    "create_action": false,
    "update_action": false,
    "delete_action": false,
    "identifier": "employee_id",
    "date_format": "DD/MM/YYYY",
    "hired_date_format": "DD/MM/YYYY",
    "update_columns": [],
    "is_include_child_company": false,
    "include_company_ids": []
  }
}
```

**Key assertion:** `config.approve_action = true`

---

### Step 17 — Map Approval Excel Columns

**`PUT /api/v3/admin/account/employee-import/{company_id}/mapping`**

Maps internal API field names to the 30 column headers in the approval Excel file.

**Body:**
```json
{
  "data": {
    "employee_id": "Employee ID",
    "disbursement_type": "Disbursement Type",
    "bank_alias": "Bank Name",
    "account_no": "Bank Account Number",
    "account_name": "Bank Account Name",
    "promptpay_type": null,
    "promptpay_id": null,
    "first_name": "First Name",
    "middle_name": "Middle Name",
    "last_name": "Last Name",
    "phone": "Mobile",
    "salary_type": "Salary Type",
    "salary": "Salary",
    "hired_date": null,
    "paycycle_code": "Pay Cycle Code",
    "paycycle_name": "Pay Cycle Name",
    "email": "Email",
    "national_id": "National ID",
    "passport_no": "Passport No",
    "status": "Status",
    "is_blacklist": null,
    "birthday_at": "Date Of Birth",
    "street_address": "Detail Address",
    "district": "District",
    "sub_district": "Sub District",
    "province": "Province",
    "postcode": "Postcode",
    "department": "Department",
    "line_id": "Line ID",
    "company_site": "Company Site",
    "deduction_type": "Deduction Type",
    "deduction": "Deduction"
  },
  "update_columns": [],
  "company_column_name": null,
  "company_mapping": {}
}
```

---

### Step 18 — Re-confirm Config After Mapping

**`PUT /api/v3/admin/account/employee-import/jobs/{job_id}`**

Same body as Step 16. Required again after column mapping to finalise the config.

---

### Step 19 — Generate Approval Preview

**`POST /api/v3/admin/account/employee-import/jobs/{job_id}/preview`**

**Body:** None

**Response (200):**
```json
{
  "job_id": "4793",
  "company_id": 514,
  "status": "preview",
  "config": { "approve_action": true, "..." },
  "preview": {
    "approve_rows": [
      {
        "employee_id": "EMPAPI-CONSENT-001",
        "first_name": "QA",
        "last_name": "Consent",
        "phone": "08xxxxxxxx",
        "national_id": 2001000099000,
        "status": "active",
        "salary": 30000,
        "bank_alias": "SCB",
        "account_no": "1xxxxxxxxx",
        "user_id": "1263406"
      }
    ],
    "create_rows": [],
    "update_rows": [],
    "delete_rows": [],
    "approve_num_row": 1,
    "create_num_row": 0,
    "update_num_row": 0,
    "delete_num_row": 0
  }
}
```

**Key assertion:** `approve_num_row > 0`

**Validation rules enforced during this step:**

| Rule | Detail | Consequence if violated |
|------|--------|------------------------|
| Phone match | `phone` in approval xlsx must exactly match the phone submitted in the employee's consent request form | Row rejected — `approve_num_row = 0` |
| Identity match | `national_id` in approval xlsx must match the value submitted during signup (for national_id employees) | Row rejected |
| Identity match | `passport_no` in approval xlsx must match the value submitted during signup (for passport_no employees) | Row rejected |
| Bank uniqueness | `account_no` must be globally unique across all banks in `user_bank` | Row rejected |
| Consent status | Employee must have `consent_status = 'pending_review'` to be eligible | Row not included in `approve_rows` |

---

### Step 20 — Validate Approval

**`POST /api/v3/admin/account/employee-import/jobs/{job_id}/validate`**

**Body:** None

**Response (200):**
```json
{ "message": "success" }
```

---

### Step 21 — Confirm Approval Import

**`POST /api/v3/admin/account/employee-import/jobs/{job_id}/import`**

**Body:** None

**Response (200):**
```json
{ "message": "success" }
```

**Effect:**
- `employee_profile.consent_status` → `'approved'`
- `users.status` → value of `Status` column in approval xlsx (`'active'` or `'inactive'`)

The `Status` column in the approval xlsx is set by the HR/admin who prepares the file. It controls whether the employee becomes fully active on the platform or remains inactive pending further steps.

---

## Approval Import Validation Rules

| Constraint | Rule | Consequence |
|---|---|---|
| Phone match | `phone` in xlsx must exactly match the phone the employee submitted in their consent request form | Row rejected |
| Identity match (national_id) | If employee submitted `national_id` during signup, the `national_id` in xlsx must match | Row rejected |
| Identity match (passport_no) | If employee submitted `passport_no` during signup, the `passport_no` in xlsx must match | Row rejected |
| Bank account uniqueness | `account_no` must be globally unique across all banks in `user_bank` | Row rejected |
| Consent status | Employee must have `consent_status = 'pending_review'` | Row excluded from approval |

**Key implication for test data:** In the standard consent flow, `national_id` and `passport_no` are pre-loaded from the screening import fixture and are fixed known values. Only `phone` and `account_no` need to be supplied dynamically at runtime via `buildApprovalXlsx()`. This differs from the Employee ID Only flow where identity values are user-declared and must also be overridden dynamically.
