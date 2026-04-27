# Digital Consent — Employee ID Only

## Feature Overview

This feature tests the digital consent signup flow for companies that configure their import file with **employee_id only** — no national_id or passport_no pre-loaded.

Unlike the standard digital consent flow where employee identity is pre-loaded from the import file, this variant requires users to **self-declare** their identity during the consent request form step.

## Business Purpose

Allow companies to use digital consent with two configurations:
1. **Employee ID + national ID/passport** (standard) — identity pre-loaded in import
2. **Employee ID only** — identity provided by the employee during signup

This test covers configuration 2.

## Signup Flow

```
1. Admin imports Excel file (employee_id only)
   ↓ employee_profile records created with consent_status = 'new'

2. User opens consent form and fills in:
   - first_name
   - last_name
   - national_id OR passport_no
   - phone number
   - (email optional)

3. System sends OTP to phone
4. User verifies OTP → Firebase custom token issued
5. User signs in with Firebase
6. User creates PIN
7. User fetches profile
   ↓ employee_profile.consent_status = 'pending_review' or 'new'
```

## Company Details

| Environment | Company | ID | Paycycle ID |
|---|---|---|---|
| Dev | QA - Digital Consent Employee ID | 866 | 3107 |
| Staging | QA - Digital Consent Employee ID | 1316 | 5206 |

## Fixture Employees

| Employee ID | Used in |
|---|---|
| `EMPAPI-CONSENT-EID-001` | TC-CONSENT-EID-002 (national_id signup) |
| `EMPAPI-CONSENT-EID-002` | TC-CONSENT-EID-003 (passport_no signup) |
| `EMPAPI-CONSENT-EID-003` | TC-CONSENT-EID-004 (non-signed-up check) |
| `EMPAPI-CONSENT-EID-004` | TC-CONSENT-EID-004 (non-signed-up check) |

## Key Difference vs Standard Consent Flow

| Aspect | Standard (`digital_consent`) | Employee ID Only (`digital_consent_employee_id`) |
|---|---|---|
| Import columns | `employee_id + national_id + passport_no` | `employee_id` only |
| `screening` key in request form | `{ employee_id, personal_id }` | `{ employee_id }` only |
| Identity in `request_form` | Not included | `national_id` or `passport_no` included |
| Screening validate step | Required | Not applicable |
