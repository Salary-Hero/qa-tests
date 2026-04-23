# Employee CRUD — Test Data

## Generated Identifiers

All identifiers are generated fresh per test run to avoid unique constraint collisions.

| Field | Generator | Example | Constraint |
|-------|-----------|---------|------------|
| `phone` | `generatePhone()` | `09{8-random-digits}` | Unique within paycycle |
| `email` | `generateEmail()` | `qa-signup-{ts}-{rand}@test.example.com` | Unique globally |
| `employee_id` | `generateEmployeeId()` | `EMP{ts}{rand}` | Unique within company |
| `account_no` | `generateRandomString(10)` | `1234567890` | Unique per bank |

Implementation: `api/helpers/identifiers.ts`

## Fixed Values

| Field | Value | Reason |
|-------|-------|--------|
| `company_id` | `128` | Salary Hero test company |
| `paycycle_id` | `3661` | Default test paycycle |
| `salary` | `30000` | Arbitrary test value |
| `salary_type` | `monthly` | Default |
| `disbursement_type` | `bank` | Default |
| `status` | `active` | Default |
| `bank_code` | `014` | Krungsri test bank |

## Field Constraints

| Field | Constraint | Consequence if violated |
|-------|-----------|------------------------|
| `employee_id` | Unique within company | 409 on create |
| `phone` | Unique within paycycle | 409 on create |
| `email` | Unique globally | 409 on create |
| `paycycle_id` | Must be sent as **number** | 400 if sent as string |
| `company_id` | Must be sent as **string** | 400 if sent as number |
| Read-only fields | Must NOT appear in PATCH | 403 if included |

## Cleanup

After each test, the employee is deleted via `DELETE /v1/admin/account/employee/{userId}`.
Backend cascades the deletion to all related tables — no manual DB cleanup needed.

If a test fails mid-way, the next run's pre-seed cleanup will find and delete the orphan by email lookup before seeding a fresh record.
