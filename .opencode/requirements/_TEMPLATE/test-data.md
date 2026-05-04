# <Feature Name> — Test Data

## Generated Identifiers

All identifiers are generated fresh per test run to avoid unique constraint collisions.

| Field | Generator | Example | Constraint |
|-------|-----------|---------|------------|
| `phone` | `resolvePhone()` | `09{8-random-digits}` | Unique within paycycle |
| `email` | `generateEmail()` | `qa-{ts}-{rand}@test.example.com` | Unique globally |
| `employee_id` | `generateEmployeeId()` | `EMP{ts}{rand}` | Unique within company |

Implementation: `api/helpers/identifiers.ts`

## Fixed Values

| Field | Value | Reason |
|-------|-------|--------|
| `company_id` | `getCompany('<name>').id` | QA test company |
| <!-- field --> | <!-- value --> | <!-- reason --> |

## Field Constraints

| Field | Constraint | Consequence if violated |
|-------|-----------|------------------------|
| <!-- field --> | <!-- constraint --> | <!-- e.g. 409 on create --> |

## Cleanup

<!-- Describe how test data is cleaned up after each test.
e.g. Employee is deleted via DELETE /v1/admin/account/employee/{userId}.
Backend cascades the deletion — no manual DB cleanup needed.
OR: hardDeleteEmployee(userId) is required because no API delete exists. -->
