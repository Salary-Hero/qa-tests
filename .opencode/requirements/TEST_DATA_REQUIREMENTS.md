# Test Data Requirements

Comprehensive specifications for test data generation, validation, and cleanup procedures.

## Test Data Generation Strategy

### Principle: Fresh Data Per Test Run

Each test run generates **completely fresh identifiers** to avoid collisions and constraint violations.

```
Test Run 1: phone=09{timestamp1}{random1}, email=qa-signup-{timestamp1}-{random1}@test.example.com
Test Run 2: phone=09{timestamp2}{random2}, email=qa-signup-{timestamp2}-{random2}@test.example.com
```

This ensures:
- ✅ No unique constraint violations between test runs
- ✅ No stale test data causing failures
- ✅ Tests can run in parallel without collisions
- ✅ Cleanup always has fresh data to work with

---

## Employee Test Data

### Employee Information

| Field | Type | Requirements | Example |
|-------|------|--------------|---------|
| `first_name` | string | Required, 1-100 chars | "Alice" |
| `last_name` | string | Required, 1-100 chars | "Smith" |
| `email` | string | Unique, valid email format | `qa-signup-{timestamp}-{random}@test.example.com` |
| `phone` | string | Unique, 10-11 digits, starts with 09 | `09{timestamp+random}` |
| `national_id` | string | Optional, unique if provided | "1234567890123" |
| `passport_no` | string | Optional, unique if provided | "AB123456" |
| `birthday_at` | date | Optional, YYYY-MM-DD format | "1990-01-15" |
| `employee_id` | string | Unique within company, required | `EMP{timestamp+random}` |
| `company_id` | string | Fixed, must exist | "128" |
| `paycycle_id` | number | Must be valid paycycle | 3661 |
| `status` | string | Enum: "active", "inactive" | "active" |
| `salary` | number | Positive integer | 30000 |
| `salary_type` | string | Enum: "monthly", "daily", "hourly" | "monthly" |
| `disbursement_type` | string | Enum: "bank", "cash" | "bank" |
| `is_blacklist` | boolean | True/False | false |
| `line_id` | string | Optional, unique if provided | null (or fixed value for LINE tests) |

### Address Data (Optional)

| Field | Type | Requirements |
|-------|------|--------------|
| `street_address` | string | Physical address |
| `sub_district` | string | Thai sub-district |
| `district` | string | Thai district |
| `province` | string | Thai province |
| `postcode` | string | 5-digit postcode |

### Bank Data

| Field | Type | Requirements |
|-------|------|--------------|
| `bank_code` | string | Thai bank code | "014" (Krungsri) |
| `account_name` | string | Account holder name |
| `account_no` | string | 10+ digit account number |

---

## Identifier Generators

### Phone Number Generator

```typescript
function generatePhone(): string {
  // Format: 09{8-random-digits}
  // Example: 0912345678
  const random = Math.random().toString().slice(2, 10);
  return `09${random}`;
}
```

**Requirements:**
- Must start with "09"
- Must be 10 digits total
- Must be unique per test run
- Used for: Phone signup, employee phone field

---

### Email Generator

```typescript
function generateEmail(): string {
  // Format: qa-signup-{timestamp}-{random}@test.example.com
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `qa-signup-${timestamp}-${random}@test.example.com`;
}
```

**Requirements:**
- Must match pattern: `qa-signup-*-*@test.example.com`
- Must be unique per test run
- Must be valid email format
- Used for: Employee email field

---

### Employee ID Generator

```typescript
function generateEmployeeId(): string {
  // Format: EMP{timestamp}{random}
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `EMP${timestamp}${random}`;
}
```

**Requirements:**
- Must start with "EMP"
- Must be unique within company
- Used for: Employee ID field in create/update

---

### National ID Generator

```typescript
function generateNationalId(): string {
  // 13-digit Thai national ID
  // Format: {10-digits}-{2-digits}-{1-digit}
  return Array.from({ length: 13 }, () => 
    Math.floor(Math.random() * 10)
  ).join('');
}
```

**Requirements:**
- 13 digits
- Must be unique if used in employee
- Used for: Employee ID signup with national ID

---

### Passport Number Generator

```typescript
function generatePassportNo(): string {
  // Format: {2-letters}{6-digits}
  const letters = Array.from({ length: 2 }, () => 
    String.fromCharCode(65 + Math.random() * 26)
  ).join('');
  const digits = Array.from({ length: 6 }, () => 
    Math.floor(Math.random() * 10)
  ).join('');
  return `${letters}${digits}`;
}
```

**Requirements:**
- 2 letters + 6 digits
- Must be unique if used in employee
- Used for: Employee ID signup with passport

---

## Signup Test Data

### Phone Signup Profile

| Field | Value | Type |
|-------|-------|------|
| `phone` | Generated fresh per run | Generated |
| `email` | Generated fresh per run | Generated |
| `employee_id` | Generated fresh per run | Generated |
| `national_id` | Fixed test value | Fixed |
| `passport_no` | Not used | N/A |

### LINE Signup Profile

| Field | Value | Type |
|-------|-------|------|
| `phone` | Generated fresh per run | Generated |
| `email` | Generated fresh per run | Generated |
| `employee_id` | Generated fresh per run | Generated |
| `line_id` | Fixed from seed config | Fixed |
| `national_id` | Fixed test value | Fixed |

**Important:** `line_id` is fixed because LINE integration requires a specific channel ID. Must be cleared to null before deletion to release unique constraint.

### Employee ID Signup Profile (National ID)

| Field | Value | Type |
|-------|-------|------|
| `phone` | Generated fresh per run | Generated |
| `email` | Generated fresh per run | Generated |
| `employee_id` | Generated fresh per run | Generated |
| `national_id` | Generated fresh per run | Generated |
| `passport_no` | Not used | N/A |

### Employee ID Signup Profile (Passport)

| Field | Value | Type |
|-------|-------|------|
| `phone` | Generated fresh per run | Generated |
| `email` | Generated fresh per run | Generated |
| `employee_id` | Generated fresh per run | Generated |
| `national_id` | Not used | N/A |
| `passport_no` | Generated fresh per run | Generated |

---

## Unique Constraints

### Database Constraints

| Field | Scope | Type | Handling |
|-------|-------|------|----------|
| `email` | Global | Unique | Generate fresh per test |
| `phone` | Paycycle | Unique | Generate fresh per test |
| `employee_id` | Company | Unique | Generate fresh per test |
| `national_id` | Global | Unique | Generate fresh per test |
| `passport_no` | Global | Unique | Generate fresh per test |
| `line_id` | Global | Unique | **Clear to null before delete** |

### Handling LINE ID Constraint

**The Problem:** LINE ID is unique globally, but tests reuse the same fixed LINE ID across runs.

**The Solution:**
```typescript
// Before deletion, clear line_id to null
await updateEmployeeViaAPI(request, token, userId, {
  information: { line_id: null }
});

// Now deletion succeeds without constraint violation
await deleteEmployee(request, userId);
```

This approach:
- ✅ Allows reusing same fixed LINE ID in each test
- ✅ Properly releases unique constraint
- ✅ Works with backend cascading deletes
- ✅ Applied in both post-test and pre-seed cleanup

---

## Test Data Validation

### API Response Validation

All API responses must validate against Zod schemas:

```typescript
// Example: EmployeeResponse validation
const response = await createEmployeeViaAPI(request, token, payload);

expect(response.information.user_id).toBeDefined();
expect(response.information.first_name).toBe('John');
expect(response.information.email).toMatch(/qa-signup-.*@test\.example\.com/);
```

### Database Validation

After API creation, verify database persistence:

```typescript
const dbUser = await getUserById(userId);
expect(dbUser.first_name).toBe('John');
expect(dbUser.email).toBe(generatedEmail);
expect(dbUser.status).toBe('active');
```

### Schema Compliance

All test data must comply with Zod schemas defined in:
- `api/schema/signup.schema.ts` - Signup response schemas
- `shared/employee-api.ts` - Employee data structures

---

## Test Data Lifecycle

### Phase 1: Pre-Seed Cleanup (Before Test)

**Purpose:** Remove any leftover test data from previous failed runs

**Process:**
1. Find employee by email (using fixed email per profile)
2. If found:
   - Clear `line_id` to null (if LINE profile)
   - Delete via API
3. If not found, continue (no orphaned data)
4. Generate fresh identifiers for this test run

**Error Handling:** Best-effort, doesn't fail if nothing to clean up

---

### Phase 2: Test Execution (During Test)

**Process:**
1. Use fresh identifiers generated in pre-seed
2. Create employee via API
3. Perform test operations (read, update, etc.)
4. API persists data to database
5. Verify via API response and database query

---

### Phase 3: Post-Test Cleanup (After Test)

**Purpose:** Delete test employee, ensuring no orphaned records

**Process:**
1. Get `user_id` from test context
2. If LINE profile:
   - Clear `line_id` to null via PATCH
3. Delete employee via API
4. Backend cascades delete to:
   - `employment` table
   - `user_identity` table
   - `user_balance` table
   - `users` table

**Critical:** Must complete even if test fails

---

## Cleanup Requirements

### What Gets Deleted

| Table | Deleted By | Trigger |
|-------|-----------|---------|
| `users` | API delete cascade | DELETE /v1/admin/account/employee/{userId} |
| `employment` | Backend cascade | FK constraint cascade |
| `user_identity` | Backend cascade | FK constraint cascade |
| `user_balance` | Backend cascade | FK constraint cascade |

### Cleanup Verification

After cleanup, verify no orphaned records:

```sql
-- Should return empty
SELECT * FROM users WHERE user_id = {testUserId};
SELECT * FROM employment WHERE legacy_user_id = {testUserId};
SELECT * FROM user_identity WHERE legacy_user_id = {testUserId};
```

### Cleanup Failure Handling

**If cleanup fails:**
1. Log error but don't fail test
2. Continue with next test
3. Pre-seed cleanup will handle next test
4. Investigate in test-results/ folder

---

## Environment-Specific Data

### DEV Environment
- Fixed credentials in `.env`
- Test OTP: Always "123456"
- Test PIN: Always "999999"
- Company ID: 128 (Salary Hero)
- Paycycle ID: 3661

### STAGING Environment
- Same as DEV for test purposes
- May have additional logging
- Performance testing friendly

### PRODUCTION
- Not tested (no automation on production)
- Manual testing only

---

## Related Documents

- 📋 [TEST_REQUIREMENTS.md](./TEST_REQUIREMENTS.md) - Test requirements overview
- 🔌 [API_CONTRACT.md](./API_CONTRACT.md) - API specifications
- 🏗️ [INFRASTRUCTURE_REQUIREMENTS.md](./INFRASTRUCTURE_REQUIREMENTS.md) - Setup & infrastructure
- 🧪 [TEST_CASES.md](./TEST_CASES.md) - Detailed test cases
