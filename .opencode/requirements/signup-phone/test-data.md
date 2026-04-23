# Signup: Phone — Test Data

## Seed Profile

File: `api/helpers/profiles/phone.ts`

A seeded employee is created before each test and deleted after.

## Generated Identifiers (fresh per run)

| Field | Generator | Example |
|-------|-----------|---------|
| `phone` | `generatePhone()` | `09{8-random-digits}` |
| `email` | `generateEmail()` | `qa-signup-{ts}-{rand}@test.example.com` |
| `employee_id` | `generateEmployeeId()` | `EMP{ts}{rand}` |

All three are generated fresh each run — no fixed values.

## Fixed Test Credentials

| Credential | Value | Source |
|-----------|-------|--------|
| OTP code | `123456` | `OTP` env var |
| PIN code | `999999` | `PINCODE` env var |

## Constraints

| Field | Constraint | Handling |
|-------|-----------|----------|
| `phone` | Unique within paycycle | Generated fresh each run |
| `email` | Unique globally | Generated fresh each run |
| `employee_id` | Unique within company | Generated fresh each run |

## Data Lifecycle

```
beforeEach:
  1. Pre-seed cleanup — search by email, delete if found
  2. Generate fresh phone, email, employee_id
  3. Create employee via admin API

test:
  4. Use ctx.identifiers.phone for OTP flow

afterEach:
  5. Delete employee via admin API (cascade cleans all tables)
```
