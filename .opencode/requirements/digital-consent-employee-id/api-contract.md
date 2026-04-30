# Digital Consent Employee ID Only — API Contract

## Screening Import Pipeline (Steps 1–7)

The screening import pipeline uses the same endpoints as the standard digital consent flow
but with **employee_id only** column mapping (no national_id or passport_no).

Base URL: `https://apiv2-{ENV}.salary-hero.com`

All admin endpoints require: `Authorization: Bearer {adminToken}`

---

### Step 1: Create Import Job

**`POST /api/v1/admin/account/screening-import/jobs`**

Sent as `multipart/form-data` (not JSON — use native `fetch` to avoid Playwright's global `Content-Type: application/json` header overriding the multipart boundary).

**Form fields:**
| Field | Value |
|---|---|
| `company_id` | `866` (dev) / `1316` (staging) |
| `is_include_child_company` | `false` |
| `file` | `.xlsx` file (employee_id column only) |

**Response (200):**
```json
{ "job_id": "4791", "company_id": 866, "status": "pending", "import_type": "...", "config": { ... } }
```

---

### Step 2: Configure Import

**`PUT /api/v1/admin/account/screening-import/jobs/:jobId`**

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

**Response (200):** Same shape as Step 1 response.

---

### Step 3: Map Columns

**`PUT /api/v1/admin/account/screening-import/:companyId/mapping`**

```json
{
  "data": {
    "employee_id": "Employee ID",
    "national_id": null,
    "passport_no": null
  },
  "update_columns": [],
  "company_column_name": null,
  "company_mapping": {}
}
```

**Response (200):**
```json
{ "id": "...", "company_id": 866, "mapping": { "employee_id": "Employee ID", "national_id": null, "passport_no": null }, "update_columns": [] }
```

---

### Step 4: Re-confirm Config After Mapping

**`PUT /api/v1/admin/account/screening-import/jobs/:jobId`**

Same body as Step 2.

---

### Step 5: Preview

**`POST /api/v1/admin/account/screening-import/jobs/:jobId/preview`**

No body.

**Response (200):**
```json
{
  "job_id": "4791",
  "company_id": 866,
  "status": "preview",
  "config": { ... },
  "preview": {
    "create_rows": [ { "employee_id": "EMPAPI-CONSENT-EID-001", ... } ],
    "update_rows": [],
    "delete_rows": [],
    "create_num_row": 4,
    "update_num_row": 0,
    "delete_num_row": 0
  }
}
```

**Assertion:** `preview.create_num_row > 0` — if zero, the file was not uploaded correctly.

---

### Step 6: Validate

**`POST /api/v1/admin/account/screening-import/jobs/:jobId/validate`**

No body.

**Response (200):** `{ "message": "success" }`

---

### Step 7: Confirm Import

**`POST /api/v1/admin/account/screening-import/jobs/:jobId/import`**

No body.

**Response (200):** `{ "message": "success" }`

**Effect:** Creates 4 `employee_profile` rows with `consent_status = 'new'`, `status = 'inactive'`.

---

## Employee Signup Flow (Steps 8–14)

### Step 8: Validate Screening (Employee ID Only)

**`POST /api/v2/public/account/consent/screening/validate`**

**Headers:** `x-app-version: {APP_VERSION}`

```json
{
  "employee_id": "EMPAPI-CONSENT-EID-001",
  "company_id": 866
}
```

No `personal_id` or `personal_id_type` — confirms the employee exists in the consent import for this company.

**Status Codes:**
- `200` — Employee found
- `404` — Employee not found

---

### Step 9: Submit Consent Request Form

**`POST /api/v2/public/account/consent/request-form/request`**

**Request (national_id variant):**
```json
{
  "personal_id_type": "national_id",
  "company_id": 866,
  "screening": { "employee_id": "EMPAPI-CONSENT-EID-001" },
  "request_form": {
    "first_name": "QA",
    "last_name": "Consent",
    "personal_id": "1234567890123",
    "email": "qa-xxx@test.example.com",
    "phone": "0812345678"
  }
}
```

**Request (passport_no variant):**
```json
{
  "personal_id_type": "passport_no",
  "company_id": 866,
  "screening": { "employee_id": "EMPAPI-CONSENT-EID-002" },
  "request_form": {
    "first_name": "QA",
    "last_name": "Consent",
    "personal_id": "QA1234567",
    "email": "qa-xxx@test.example.com",
    "phone": "0812345678"
  }
}
```

**Key difference from standard consent:** `screening` contains only `employee_id`. The user-provided identity goes into `request_form.personal_id`.

**Response (200):**
```json
{ "verification": { "ref_code": "REF_ABC123" } }
```

---

### Step 10: Verify OTP

**`POST /api/v1/public/account/consent/request-form/verify`**

```json
{ "ref_code": "REF_ABC123", "code": "111111", "phone": "0812345678" }
```

**Response (200):**
```json
{ "verification_info": { "token": "eyJhbGci..." } }
```

Returns a Firebase custom token.

---

### Steps 11–13: Firebase Sign-In + PIN Creation

Same as all other signup flows.

| Step | Endpoint |
|---|---|
| Sign in with custom token | `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=...` |
| Refresh token (pre-PIN) | `https://securetoken.googleapis.com/v1/token?key=...` |
| Create PIN | `POST /api/v1/user/account/profile/pincode/create` |
| Refresh token (post-PIN) | `https://securetoken.googleapis.com/v1/token?key=...` |

---

### Step 14–15: Get Profile

**`GET /api/v1/user/account/profile`**

**Response (200) — key assertions:**
```json
{
  "profile": { "has_pincode": true, "user_id": "1263406" },
  "employee_profile": { "consent_status": "pending_review" }
}
```

After successful signup:
- `profile.has_pincode = true`
- `employee_profile.consent_status` in `['pending_review', 'new']`
- `users.status = 'inactive'` (verified via DB)

---

## Approval Import Pipeline (Steps 15–21)

This is a **separate 7-step pipeline** using `/v3/admin/account/employee-import/` endpoints.
It is triggered by an admin after reviewing the employee's submitted consent form.

**Key difference from screening import:**
- Endpoint base: `/v3/admin/account/employee-import/` (not `/v1/admin/account/screening-import/`)
- Config: `approve_action: true`, `create_action: false`
- Column mapping: full employee data (name, bank, salary, address, etc.)
- Preview response contains `approve_rows` and `approve_num_row` (not `create_rows`)
- Form data includes `all_pay_cycle_ids` and `pay_cycle_ids`

---

### Step 15: Create Approval Job

**`POST /api/v3/admin/account/employee-import/jobs`**

Sent as `multipart/form-data` (same native fetch requirement as Step 1).

**Form fields:**
| Field | Value |
|---|---|
| `company_id` | `866` (dev) / `1316` (staging) |
| `is_include_child_company` | `false` |
| `all_pay_cycle_ids` | `true` |
| `pay_cycle_ids[0]` | `null` |
| `pay_cycle_ids[1]` | `3107` (dev) / `5206` (staging) |
| `file` | approval `.xlsx` file (full employee data) |

**Response (200):** Same shape as Step 1.

---

### Step 16: Configure Approval Import

**`PUT /api/v3/admin/account/employee-import/jobs/:jobId`**

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

**Response (200):** Same shape as Step 1.

---

### Step 17: Map Approval Columns

**`PUT /api/v3/admin/account/employee-import/:companyId/mapping`**

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

### Step 18: Re-confirm Config After Mapping

**`PUT /api/v3/admin/account/employee-import/jobs/:jobId`**

Same body as Step 16.

---

### Step 19: Approval Preview

**`POST /api/v3/admin/account/employee-import/jobs/:jobId/preview`**

No body.

**Validation rules applied during steps 19–20:**

The system validates each row in the approval xlsx against the employee's submitted consent request form and the existing database state. A row is **rejected** (excluded from `approve_rows`) if any of the following are violated:

| Rule | Detail |
|------|--------|
| Phone must match | `phone` in xlsx must exactly match the phone the employee submitted in their consent request form |
| Identity must match | If employee used `national_id` during signup: `national_id` in xlsx must match. If employee used `passport_no`: `passport_no` in xlsx must match |
| Bank account must be unique | `account_no` must not already exist in `user_bank` for any other user in the system (globally, across all banks) |

If a row is rejected: it does not appear in `approve_rows` and `approve_num_row` will be lower than expected (0 if all rows fail).

**Response (200):**
```json
{
  "job_id": "4793",
  "company_id": 866,
  "status": "preview",
  "config": { "approve_action": true, "create_action": false, ... },
  "preview": {
    "approve_rows": [
      {
        "employee_id": "EMPAPI-CONSENT-EID-001",
        "first_name": "One",
        "last_name": "QA",
        "phone": "0955037014",
        "email": "EMPAPI-CONSENT-EID-001@test.com",
        "national_id": 5503701455000,
        "status": "active",
        "salary": 30000,
        "bank_alias": "SCB",
        "account_no": 5503700001,
        "account_name": "One QA",
        "user_id": "1263406",
        "..."
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

**Assertion:** `preview.approve_num_row > 0` — if zero, no eligible employees were found (employee may not have `consent_status = 'pending_review'`).

---

### Step 20: Validate Approval

**`POST /api/v3/admin/account/employee-import/jobs/:jobId/validate`**

No body.

**Response (200):** `{ "message": "success" }`

---

### Step 21: Confirm Approval Import

**`POST /api/v3/admin/account/employee-import/jobs/:jobId/import`**

No body.

**Response (200):** `{ "message": "success" }`

**Effect:**
- `employee_profile.consent_status` → `'approved'`
- `users.status` → `'active'`

---

## Business Rules

| Rule | Detail |
|---|---|
| `consent_status = new` | Cannot be manually changed — only changes via signup flow |
| `consent_status = new` → `pending_review` | Happens automatically after user submits consent request form |
| `pending_review` → `disabled` | Admin/HR can do this manually |
| `pending_review` → `pending_update` | Admin/HR can do this manually (request change) |
| `disabled` → `pending_update` | Admin/HR can do this manually |
| Approval import | Only processes employees with `consent_status = pending_review` |
| Identity matching | `phone` + (`national_id` or `passport_no`) in approval xlsx must match the employee's submitted consent request form |
| Bank uniqueness | `account_no` must be globally unique across all banks in `user_bank` — duplicate causes row rejection |
| After approval | `consent_status = approved`, `users.status = active` |
| After rejection | `consent_status = rejected`, `users.status = inactive` |

---

## Error Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```
