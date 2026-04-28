# Digital Consent Employee ID Only — Test Requirements

## What must be tested

### 1. Import creates correct records

After the 7-step import pipeline runs, 4 `employee_profile` records must be created with `consent_status = 'new'`.

**Why**: Verifies the import pipeline handles employee_id-only files correctly. A failure here means no employees can sign up.

### 2. Signup with national_id succeeds

A user provides `employee_id + national_id + phone` during the consent request form. The full signup flow (OTP → Firebase → PIN → profile) must complete. The profile must show `employee_profile.consent_status` in `['pending_review', 'new']`.

**Why**: This is the primary use case — employees who identify with a national ID.

### 3. Signup with passport_no succeeds

Same as above but with `passport_no` instead of `national_id`.

**Why**: Some employees have passports, not national IDs. Both identity types must work.

### 4. Non-signed-up employees are unaffected

Employees who have not signed up must retain `consent_status = 'new'`.

**Why**: Ensures the import and other signups don't accidentally modify records for employees who haven't gone through the consent flow.

## What is NOT tested here

- The `screeningValidate` step — this step validates identity against the import file, but since the import file has no identity values, this step is not applicable for employee_id-only companies.
- Companies that mix employee_id-only with identity columns — that is the standard `digital_consent` test.
