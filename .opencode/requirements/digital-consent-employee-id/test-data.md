# Digital Consent Employee ID Only — Test Data

## Company

| Field | Dev | Staging |
|---|---|---|
| Company name | QA - Digital Consent Employee ID | QA - Digital Consent Employee ID |
| Company ID | 866 | 1316 |
| Paycycle ID | 3107 | 5206 |
| Config key | `digital_consent_employee_id` | `digital_consent_employee_id` |

Use `getCompany('digital_consent_employee_id').id` — never hardcode `866` or `1316`.

## Screening Import Fixture

File: `api/fixtures/digital-consent-employee-id-import.xlsx`

**Columns:** `Employee ID` only — no national_id or passport_no.

| Row | Employee ID | Used in |
|---|---|---|
| 1 | `EMPAPI-CONSENT-EID-001` | TC-CONSENT-EID-002, TC-CONSENT-EID-005 |
| 2 | `EMPAPI-CONSENT-EID-002` | TC-CONSENT-EID-003 |
| 3 | `EMPAPI-CONSENT-EID-003` | TC-CONSENT-EID-004 (non-signed-up check) |
| 4 | `EMPAPI-CONSENT-EID-004` | TC-CONSENT-EID-004 (non-signed-up check) |

## Approval Import Fixture

File: `api/fixtures/digital-consent-employee-id-import-approval.xlsx`

Used in TC-CONSENT-EID-005. Contains full employee data for the employees who have submitted their consent request form and are awaiting approval.

**Columns (mapped in step 17):**

| Column header in xlsx | API field |
|---|---|
| Employee ID | `employee_id` |
| First Name | `first_name` |
| Middle Name | `middle_name` |
| Last Name | `last_name` |
| Mobile | `phone` |
| Email | `email` |
| National ID | `national_id` |
| Passport No | `passport_no` |
| Status | `status` |
| Salary | `salary` |
| Salary Type | `salary_type` |
| Pay Cycle Code | `paycycle_code` |
| Pay Cycle Name | `paycycle_name` |
| Disbursement Type | `disbursement_type` |
| Bank Name | `bank_alias` |
| Bank Account Number | `account_no` |
| Bank Account Name | `account_name` |
| Date Of Birth | `birthday_at` |
| Department | `department` |
| Company Site | `company_site` |
| Deduction Type | `deduction_type` |
| Deduction | `deduction` |
| Detail Address | `street_address` |
| District | `district` |
| Sub District | `sub_district` |
| Province | `province` |
| Postcode | `postcode` |

**Key requirement:** The `Status` column in the approval xlsx must be `active` for the employee to be activated after approval.

## Validation Constraints (Approval Import)

The approval import validates each row before processing. A row is **rejected** if any constraint is violated — it will not appear in `approve_rows` and `approve_num_row` will be lower than expected.

| Constraint | Rule | Consequence if violated |
|---|---|---|
| Phone match | `phone` in approval xlsx must exactly match the phone submitted in the employee's consent request form | Row rejected — `approve_num_row = 0` |
| Identity match (national_id) | If employee submitted `national_id` during signup: `national_id` in approval xlsx must match the submitted value | Row rejected |
| Identity match (passport_no) | If employee submitted `passport_no` during signup: `passport_no` in approval xlsx must match the submitted value | Row rejected |
| Bank account uniqueness | `account_no` must be globally unique across all banks in `user_bank` — no other user may have the same account number | Row rejected |

**Implication for fixture data:**

The approval fixture (`digital-consent-employee-id-import-approval.xlsx`) contains fixed phone and identity values. These must match the values in the screening/signup fixture. Since TC-CONSENT-EID-005 generates a dynamic `phone` and `national_id` during the signup step but the approval xlsx has fixed values, the test must either:
- Use the fixed phone/identity from the approval xlsx during signup (i.e. use static values, not generated ones for TC-CONSENT-EID-005), **or**
- The approval import helper must accept the dynamic values used during signup and construct the xlsx at runtime

This is a design decision for the implementation phase. Document the chosen approach in the test helper JSDoc.

## Approval Import Config

| Field | Value | Reason |
|---|---|---|
| `approve_action` | `true` | Marks this as an approval import — not a create |
| `create_action` | `false` | Must be false — approval import does not create new employees |
| `update_action` | `false` | |
| `delete_action` | `false` | |
| `identifier` | `employee_id` | Matches employees by employee_id |
| `all_pay_cycle_ids` | `true` | Required in form data for approval job creation |

## Dynamic Identifiers (generated fresh per run)

| Field | Generator | Purpose |
|---|---|---|
| `phone` | `resolvePhone()` | Receives OTP — uses pool on staging |
| `email` | `generateEmail()` | Included in consent request form |
| `national_id` | `generateNationalId()` | User-provided identity for TC-CONSENT-EID-002, TC-CONSENT-EID-005 |
| `passport_no` | `generatePassportNo()` | User-provided identity for TC-CONSENT-EID-003 |

All identifiers are generated using `Date.now()` + random to guarantee uniqueness per run.

## OTP

| Environment | Value | Source |
|---|---|---|
| Dev | `111111` | `seed-config.json` → `dev.otp` |
| Staging | `199119` | `seed-config.json` → `staging.otp` |

## consent_status Transition Map

```
new  ──(user submits form)──▶  pending_review  ──(approval import)──▶  approved
                                     │
                              (admin/HR action)
                                     │
                                     ├──▶  disabled  ──(admin/HR)──▶  pending_update
                                     │
                                     └──▶  pending_update
                                     │
                              (HR rejection)
                                     │
                                     └──▶  rejected
```

## Cleanup Strategy

Since the screening import file has no pre-loaded `national_id`/`passport_no`, cleanup uses `findSignedUpUserIdsByEmployeeIds()` (searches `employment` table by `employee_id + company_id`) rather than `findSignedUpUserIds()`.

Both `beforeAll` and `afterAll` run:
1. `cleanupConsentEidSignedUpUsers(CONSENT_EID_EMPLOYEE_IDS, COMPANY_ID)` — finds and hard-deletes any signed-up users from previous runs
2. `deleteEmployeeProfileRecords(CONSENT_EID_EMPLOYEE_IDS, COMPANY_ID)` — clears `employee_profile_audit` + `employee_profile`

`afterEach` hard-deletes the user who signed up in that specific test via `hardDeleteEmployee(signedUpUserId)`.

**Note for TC-CONSENT-EID-005:** After the approval import runs, the signed-up user's `users.status` will be `active`. `hardDeleteEmployee()` still handles this correctly — it does a hard delete regardless of status.
