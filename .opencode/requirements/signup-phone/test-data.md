# Signup: Phone — Test Data

## Seed Profile

File: `api/helpers/profiles/phone.ts`

A seeded employee is created before each test and deleted after.

## Phone Number Strategy — Per Environment

| Environment | Strategy | Source |
|---|---|---|
| `dev` | `generatePhone()` — random `08xxxxxxxx` | `api/helpers/identifiers.ts` |
| `staging` | `pickPhoneFromPool(getPhonePool())` — random pick from approved pool | `api/helpers/identifiers.ts` |

### Staging approved phone pool

| Field | Value |
|---|---|
| Range | `0881001500` – `0881001600` (101 numbers) |
| Config | `shared/fixtures/seed-config.json` → `staging.phonePool` |

**Why this range only**: The staging environment sends real OTP messages to real phone numbers. Only this range is configured with an OTP bypass, meaning the system returns a hardcoded OTP and ref_code instead of sending an SMS. Any number outside this range will trigger a real SMS delivery.

### Staging OTP bypass

| Field | Value | Notes |
|---|---|---|
| OTP code | `199119` | Stored in `seed-config.json` `staging.otp` and `staging.otpBypass.code` |
| ref_code | `salary-hero-bypass` | Returned automatically by the API for numbers in the pool — not hardcoded in tests |

The test reads `ref_code` from the OTP request response and sends it in the verify step. No hardcoding is needed — the API returns `salary-hero-bypass` automatically for approved pool numbers.

## Generated Identifiers (fresh per run)

| Field | Generator | Example |
|---|---|---|
| `phone` | env-aware (see above) | `0881001537` (staging) / `0812345678` (dev) |
| `email` | `generateEmail()` | `qa-signup-{ts}-{rand}@qa.com` |
| `employee_id` | `generateEmployeeId()` | `EMP{ts}{rand}` |

## Fixed Test Credentials

| Credential | Dev value | Staging value | Source |
|---|---|---|---|
| OTP code | `111111` | `199119` | `OTP` env var (set per environment) |
| PIN code | `000000` | `000000` | `PINCODE` env var |

## Constraints

| Field | Constraint | Handling |
|---|---|---|
| `phone` | Unique within paycycle | Generated/picked fresh each run |
| `email` | Unique globally | Generated fresh each run |
| `employee_id` | Unique within company | Generated fresh each run |
| `phone` (staging) | Must be in approved pool | `pickPhoneFromPool()` enforces this |

## Data Lifecycle

```
beforeEach:
  1. Pre-seed cleanup — search by phone, delete if found (idempotent)
  2. Pick phone from pool (staging) or generate random phone (dev)
  3. Generate fresh email and employee_id
  4. Create employee via admin API

test:
  5. Use ctx.identifiers.phone for OTP flow
  6. API returns ref_code = "salary-hero-bypass" for staging pool numbers

afterEach:
  7. Delete employee via admin API (cascade cleans all tables)
```
