# Signup: LINE — Test Data

## Seed Profile

File: `api/helpers/profiles/line.ts`

## Identifiers

| Field | Type | Value | Reason |
|-------|------|-------|--------|
| `line_id` | **Fixed** | From `getFixedIdentifier('line_id')` in seed config | LINE integration requires a specific registered LINE ID |
| `phone` | Generated | `09{8-random-digits}` | Must be unique per run |
| `email` | Generated | `qa-signup-{ts}-{rand}@test.example.com` | Must be unique per run |
| `employee_id` | Generated | `EMP{ts}{rand}` | Must be unique within company |

## The `line_id` Constraint Problem

`line_id` is globally unique in the database. Because the same fixed LINE ID is reused across every test run, it must be explicitly cleared before the employee is deleted — otherwise the next test run will fail at LINE signup with a **428** error.

### Cleanup Sequence (both post-test and pre-seed phases)

```typescript
// Step 1: Clear line_id to null to release the unique constraint
await updateEmployeeViaAPI(request, token, userId, {
  information: { line_id: null }
} as any)  // best-effort — continue even if this fails

// Step 2: Delete the employee (cascade cleans all tables)
await deleteEmployee(request, userId)
```

Implementation: `api/helpers/profiles/line.ts → cleanupEmployee`

## Fixed Test Credentials

| Credential | Value | Source |
|-----------|-------|--------|
| OTP code | `123456` | `OTP` env var |
| PIN code | `999999` | `PINCODE` env var |
| LINE channel ID | Fixed | `LINE_CHANNEL_ID` env var |
| LINE access token | Fixed per env | `LINE_ACCESS_TOKEN_DEV` env var |

## Data Lifecycle

```
beforeEach:
  1. Pre-seed cleanup:
     a. Find employee by email
     b. PATCH line_id = null (best-effort)
     c. Delete employee
  2. Generate fresh phone, email, employee_id
  3. Use fixed line_id from seed config
  4. Create employee via admin API

test:
  5. Get LINE access token
  6. Run full signup flow

afterEach:
  7. PATCH line_id = null (best-effort)
  8. Delete employee (cascade cleans all tables)
```
