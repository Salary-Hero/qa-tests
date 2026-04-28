# Digital Consent Employee ID Only — API Contract

The import pipeline (Steps 1–7) uses the same endpoints as the standard digital consent flow.
See `digital-consent/api-contract.md` for the import pipeline contract.

The key difference is in the **request form step** (Step 8 of the full user flow).

---

## Step 8: Validate Screening Identity (Employee ID Only variant)

**`POST /api/v2/public/account/consent/screening/validate`**

**Headers:** `x-app-version: {APP_VERSION}`

**Request:**
```json
{
  "employee_id": "EMPAPI-CONSENT-EID-001",
  "company_id": 866
}
```

No `personal_id` or `personal_id_type` — just confirms the employee exists in the consent import for this company.

**Status Codes:**
- `200` - Employee found in consent import
- `404` - Employee not found

---

## Step 9: Submit Consent Request Form (Employee ID Only variant)

**`POST /api/v2/public/account/consent/request-form/request`**

**Headers:** `x-app-version: {APP_VERSION}`

**Request (national_id):**
```json
{
  "company_id": 866,
  "screening": {
    "employee_id": "EMPAPI-CONSENT-EID-001"
  },
  "request_form": {
    "first_name": "QA",
    "last_name": "Consent",
    "national_id": "1234567890123",
    "email": "qa-signup-xxx@qa.com",
    "phone": "0812345678"
  }
}
```

**Request (passport_no):**
```json
{
  "company_id": 866,
  "screening": {
    "employee_id": "EMPAPI-CONSENT-EID-002"
  },
  "request_form": {
    "first_name": "QA",
    "last_name": "Consent",
    "passport_no": "QA1234567",
    "email": "qa-signup-xxx@qa.com",
    "phone": "0812345678"
  }
}
```

**Key difference from standard consent:** The `screening` object contains **only `employee_id`** — no `personal_id` field. The user-provided identity moves into `request_form`.

**Response (200):**
```json
{
  "verification": {
    "ref_code": "REF_ABC123"
  }
}
```

**Assertions:**
```
body.verification.ref_code defined
```

---

## Step 9: Verify OTP

Same as standard consent flow — see `digital-consent/api-contract.md`.

**`POST /api/v1/public/account/consent/request-form/verify`**

**Response:**
```json
{
  "verification_info": {
    "token": "eyJhbGci..."
  }
}
```

---

## Steps 10–13: Firebase + PIN + Profile

Same as all other signup flows. See `shared/authentication.md` (if exists) or `signup-phone/api-contract.md`.

---

## Profile response — key assertion

**`GET /api/v1/user/account/profile`**

```json
{
  "profile": {
    "has_pincode": true
  },
  "employee_profile": {
    "consent_status": "pending_review"
  }
}
```

**Assertions:**
```
profile.has_pincode = true
employee_profile.consent_status in ['pending_review', 'new']
```
