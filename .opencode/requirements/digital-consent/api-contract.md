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
      { "employee_id": "TS01900", "national_id": 2001000099000, "passport_no": "TSPP1900", "company_id": 514 },
      { "employee_id": "TS01901", "national_id": 2001000099001, "passport_no": "TSPP1901", "company_id": 514 },
      { "employee_id": "TS01902", "national_id": 2001000099002, "passport_no": "TSPP1902", "company_id": 514 },
      { "employee_id": "TS01903", "national_id": 2001000099003, "passport_no": "TSPP1903", "company_id": 514 }
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
  "employee_id": "TS01900",
  "personal_id": "2001000099000",
  "personal_id_type": "national_id",
  "company_id": 514
}
```

For passport signup, use:
```json
{
  "employee_id": "TS01901",
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
    "employee_id": "TS01900",
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
    "is_consent_accepted": true,
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
- `profile.is_consent_accepted = true`
- `profile.has_pincode = true`

---

## DB Verification

Direct database queries used for verifying `employee_profile` state. No API endpoint exists for this.

```sql
-- After import (TC-CONSENT-001): expect 4 rows with consent_status = 'new'
SELECT employee_id, consent_status
FROM employee_profile
WHERE employee_id IN ('TS01900', 'TS01901', 'TS01902', 'TS01903')
  AND company_id = 514
  AND deleted_at IS NULL;

-- After signup (TC-CONSENT-002, TC-CONSENT-003): expect consent_status = 'pending_review'
SELECT consent_status
FROM employee_profile
WHERE employee_id = 'TS01900'
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
