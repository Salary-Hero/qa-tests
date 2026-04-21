# Signup: Employee ID — Test Data

## Seed Profiles

Two profiles, one per identity type:

| Profile | File | Identity field |
|---------|------|---------------|
| `employeeIdSignupProfile` | `api/helpers/profiles/employee-id.ts` | `national_id` |
| `employeeIdPassportSignupProfile` | `api/helpers/profiles/employee-id.ts` | `passport_no` |

## Generated Identifiers (fresh per run)

All fields generated fresh each run — no fixed values.

| Field | Generator | Example | Used in |
|-------|-----------|---------|---------|
| `phone` | `generatePhone()` | `09{8-random-digits}` | OTP flow |
| `email` | `generateEmail()` | `qa-signup-{ts}-{rand}@test.example.com` | Employee seed |
| `employee_id` | `generateEmployeeId()` | `EMP{ts}{rand}` | Lookup step |
| `national_id` | `generateNationalId()` | 13-digit random string | Lookup identity (TC-SIGN-003) |
| `passport_no` | `generatePassportNo()` | `{2-letters}{6-digits}` e.g. `AB123456` | Lookup identity (TC-SIGN-004) |

## Identity Format Specifications

### National ID
- 13 digits, numeric only
- Example: `1234567890123`
- Generator: `Array.from({length:13}, () => Math.floor(Math.random()*10)).join('')`

### Passport Number
- 2 uppercase letters + 6 digits
- Example: `AB123456`
- Generator: `{randomLetter}{randomLetter}{6-random-digits}`

## Constraints

| Field | Constraint | Handling |
|-------|-----------|----------|
| `employee_id` | Unique within company | Generated fresh per run |
| `national_id` | Unique globally | Generated fresh per run |
| `passport_no` | Unique globally | Generated fresh per run |
| `phone` | Unique within paycycle | Generated fresh per run |
| `email` | Unique globally | Generated fresh per run |

## Fixed Test Credentials

| Credential | Value | Source |
|-----------|-------|--------|
| OTP code | `123456` | `OTP` env var |
| PIN code | `999999` | `PINCODE` env var |
| Company ID | `128` | `TEST_COMPANY_ID` in env config |

## Data Lifecycle

```
beforeEach:
  1. Pre-seed cleanup — search by email, delete if found
  2. Generate fresh phone, email, employee_id
  3. Generate fresh national_id OR passport_no (depending on profile)
  4. Create employee via admin API

test:
  5. Use ctx.identifiers.employee_id + national_id/passport_no for lookup
  6. Run full signup flow

afterEach:
  7. Delete employee via admin API
```
