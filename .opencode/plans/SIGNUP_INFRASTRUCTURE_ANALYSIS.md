# Signup Test Infrastructure Analysis

## Overview
The signup test infrastructure uses a profile-based seeding system that creates employees via the Admin API, then tests the user signup flow. The system is designed to be idempotent with pre-seed and post-test cleanup.

---

## 1. Current Seeding Mechanism (`/api/helpers/seed.ts`)

### Flow
1. **Pre-seed Cleanup**: Runs cleanup steps in order (best-effort, errors ignored)
   - Allows idempotent test runs even if previous cleanup failed
2. **Employee Creation**: Calls profile's `createEmployee()` function
3. **Context Return**: Returns `SeedContext` with company, employee, and identifiers

### Key Types
```typescript
SeedContext {
  company: Company                    // ID, name, qa_paycycle_id
  employee: Employee                  // user_id, identifiers
  identifiers: Identifiers            // phone, line_id, email, employee_id, etc.
}

SeedProfile {
  name: string                        // Profile identifier
  authMethod: AuthMethod              // 'phone' | 'line' | 'employee_id' | 'entra_id'
  identifierStrategy: IdentifierStrategy  // 'generated' | 'fixed' | 'pool'
  resolveIdentifiers()                // Returns identifiers for this run
  resolveCompany()                    // Returns company for this run
  createEmployee()                    // Creates employee via Admin API
  cleanupSteps: CleanupStep[]         // Ordered cleanup functions
  parallelism: 'safe' | 'must-be-serial'
}
```

### Cleanup Pattern
- Each profile defines `cleanupSteps` - array of functions
- Each step receives full `SeedContext`
- Steps must tolerate "not found" errors (idempotent)
- Steps are run in order, one by one
- Errors are caught and logged, never thrown
- Used in both pre-seed and post-test phases

---

## 2. Database Tables Involved

### Table: `users` (Legacy User Account)
**Created by**: Admin API `POST /admin/employees`
**Columns**: 
- `user_id` (PK)
- `email`
- `first_name`
- `last_name`
- `status`

**Seeded with**: Email, first_name, last_name from `buildMonthlyEmployeePayload()`

---

### Table: `employment` (Employment Record)
**Created by**: Admin API (via employee creation)
**Columns**:
- `employment_id` (PK)
- `legacy_user_id` (FK → users.user_id)
- `company_id`
- `employee_id` (string, nullable)
- `user_uid` (UUID, null initially, set on signup)
- `status`
- `salary_type`
- `employee_type`
- `start_date`
- `end_date`

**Seeded with**: 
- `employee_id` (if provided)
- `company_id` from profile's company
- Various other employment fields from payload

---

### Table: `user_identity` (User Identity - Created During Signup)
**Created by**: Signup flow (not during employee creation)
**Columns**:
- `user_uid` (PK, UUID)
- `legacy_user_id` (FK → users.user_id)
- `personal_email` (nullable)
- `first_name`
- `last_name`
- `phone_number`
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Note**: 
- NOT created during employee seeding
- Created when user completes signup flow and creates PIN
- This is where `signup_at` timestamp may be set

---

### Table: `user_balance` 
**Status**: No references found in test codebase
- May not be involved in signup flow
- Or may be optional/created separately

---

## 3. What Gets Created When a User Signs Up

### During Employee Seeding (Pre-Test)
1. **users** table
   - Email, first/last name, status='active'
   
2. **employment** table
   - Company ID, employee_id (if auth method requires it)
   - Employment details (salary, status, etc.)
   - `user_uid` is NULL at this point

3. Admin API returns `user_id` (from users table)

### During Signup Flow (Test Execution)
User flow steps:
1. **Request OTP**: `/api/v2/public/account/signup/phone` (or LINE/employee-id variant)
   - Phone number OR line_id OR employee_id lookup
   - Validates user exists as employee
   - Returns verification ref code

2. **Verify OTP**: Same endpoint with `?action=verify`
   - OTP verification
   - Returns Firebase custom token

3. **Firebase Sign In**: Creates Firebase user if needed
   - Custom token → Firebase ID token + refresh token

4. **Create PIN**: `/api/v1/user/account/profile/pincode/create`
   - Sets user's PIN
   - **Likely sets `signup_at` timestamp** (inference from tests checking `signup_at` after this step)

5. **Get Profile**: `/api/v1/user/account/profile`
   - Returns profile with `signup_at` value
   - Confirms `has_pincode: true`

### Likely Table Updates During Signup
1. **employment table**: 
   - `user_uid` populated (links to Firebase UID)
   - Possibly other fields

2. **user_identity table**: 
   - Created during signup flow
   - Populated with phone, email, personal details
   - `created_at`, `updated_at` timestamps set
   - `signup_at` may be here (need API source verification)

---

## 4. What Currently Gets Deleted on Cleanup

### Phone Profile Cleanup (`phone.ts`)
```typescript
cleanupSteps: [cleanupEmployee]
```

**cleanupEmployee step**:
1. Uses `findEmployeeByIdentifier(request, company, phone, 'phone')`
   - Searches via Admin API `/api/v1/admin/employees/search?search=...`
   - Matches by phone number and company
   
2. If found, calls `deleteEmployee(request, userId)`
   - Makes `DELETE /api/v1/admin/employees/{userId}`
   - Returns 404 if not found (safe)

**What actually gets deleted** (API-side, not query-verified):
- Presumably: users, employment, user_identity rows
- Backend handles cascading deletes

---

### Line Profile Cleanup (`line.ts`)
```typescript
cleanupSteps: [cleanupEmployee]
```

**cleanupEmployee step**:
1. Uses `findEmployeeByIdentifier(request, company, email, 'email')`
   - Searches by fixed email (line_id is not searchable via API)
   - Note: Phone is generated per-run, so can't use it for cleanup lookup

2. If found, calls `deleteEmployee(request, userId)`

---

### Employee-ID Profile Cleanup (`employee-id.ts`)
```typescript
cleanupSteps: [cleanupEmployee]
```

**cleanupEmployee step**:
1. Uses `findEmployeeByIdentifier(request, company, employee_id, 'employee_id')`
   - Searches by employee_id

2. If found, calls `deleteEmployee(request, userId)`

---

## 5. What's Missing That Causes signup_at Conflicts

### The Problem
Tests can fail with `signup_at` already having a value when trying to test signup flow again.

### Root Cause Analysis

1. **user_identity.signup_at not cleared on cleanup**
   - `deleteEmployee()` API endpoint deletes via Admin
   - We don't control what Admin API deletes
   - If `user_identity` table is NOT deleted on employee deletion
   - Then `signup_at` persists across runs

2. **Direct DB Cleanup Not Available**
   - Current system uses Admin API for cleanup
   - Admin API may have soft-delete or partial delete logic
   - Tests cannot force hard-delete via API

3. **Identifier Lookup Can Fail Pre-Seed**
   - If employee_id was created but signup_at is persisted
   - Next test run might not find the stale record to clean it
   - Or finds it but deletion doesn't clear signup_at

### Specific Scenarios Where It Breaks

**Scenario 1: Phone Profile Re-run**
- Test 1: Creates phone number `0812345678`, user completes signup
  - users table: created
  - employment table: created, `user_uid` = firebase_uid
  - user_identity table: created, `signup_at` = timestamp
- Pre-seed cleanup for Test 2: 
  - Finds by phone `0812345678`
  - Deletes employee
  - But user_identity.signup_at might not be cleared
- Test 2 signup flow:
  - Tries to set PIN → `signup_at` already exists
  - Conflict or unexpected state

**Scenario 2: Line Profile Serial Mode**
- Line uses `parallelism: 'must-be-serial'` (not parallel)
- Reuses same line_id across runs (fixed identifier)
- cleanup uses email (fixed) for lookup instead
- If email lookup fails, stale line_id record remains
- Next run: Line ID already associated with existing user

---

## 6. Hard Reset: What Needs to Happen

### Option A: Database-Level Direct Cleanup
```sql
-- Hard reset for a specific user (by user_id)
BEGIN;
  -- Delete in foreign key order
  DELETE FROM user_identity WHERE legacy_user_id = $1;
  DELETE FROM employment WHERE legacy_user_id = $1;
  DELETE FROM users WHERE user_id = $1;
COMMIT;
```

### Option B: API-Level Enhanced Cleanup
If Admin API `DELETE /admin/employees/{userId}` doesn't cascade properly:
1. Make direct DB queries (if tests have DB access)
2. Query by identifier (phone, email, employee_id)
3. Find all related records
4. Delete in correct order

### Option C: Backup: Test Isolation
If hard reset not possible:
1. Use generated/unique identifiers per run (already done for phone, employee_id)
2. For line (fixed identifiers): Consider switching to generated phone + email for search
3. Or: Run line tests separately, not in parallel with other suites

---

## 7. Infrastructure Files and Responsibilities

### `/api/helpers/seed.ts`
- **Responsibility**: Orchestrate seeding and cleanup
- **Does**: Runs cleanup steps in order, handles errors
- **Doesn't**: Know about specific identifiers or employee creation

### `/api/helpers/employee.ts`
- **Responsibility**: Employee CRUD via Admin API
- **Does**: Create, delete, search employees
- **Doesn't**: Create user_identity or user_balance
- **Key functions**:
  - `buildMonthlyEmployeePayload()`: Builds create payload
  - `createEmployee()`: POST to Admin API
  - `deleteEmployee()`: DELETE via Admin API
  - `findEmployeeByIdentifier()`: Search by phone/email/employee_id/line_id

### `/api/helpers/profiles/phone.ts`, `line.ts`, `employee-id.ts`
- **Responsibility**: Define signup flow specifics
- **Does**: Define identifiers, cleanup steps, createEmployee implementation
- **Doesn't**: Execute cleanup (that's seed.ts job)

### `/api/helpers/identifiers.ts`
- **Responsibility**: Generate unique test data
- **Does**: Generate phone, employee_id, national_id, passport_no, account_no
- **Strategy**: Timestamp + random suffix for uniqueness

### `/shared/db.ts`
- **Responsibility**: Database connection
- **Does**: Provides `query()` function for direct SQL
- **Currently used by**: test-helpers.ts (employee deletion tests)
- **Not used by**: signup test cleanup (uses Admin API instead)

### `/shared/test-helpers.ts`
- **Responsibility**: Utility functions for DB verification
- **Key function**: `deleteEmployeeByUserId(userId)`
  - Does hard reset via direct SQL
  - Deletes in order: employment → user_identity → users
  - Currently not used by signup tests

---

## 8. Signup API Contract Summary

### Phone Signup
1. `POST /api/v2/public/account/signup/phone` → Get verification ref_code
2. `POST /api/v2/public/account/signup/phone?action=verify` → Get Firebase token
3. `POST /api/v1/user/account/profile/pincode/create` → Create PIN, set signup_at
4. `GET /api/v1/user/account/profile` → Verify signup_at is set

### Line Signup
1. `POST /api/v2/public/account/signup/line` → Get auth_challenge
2. `POST /api/v2/public/account/signup/line/add-phone?action=request` → Get ref_code
3. `POST /api/v2/public/account/signup/line/add-phone?action=verify` → Get Firebase token
4. Same PIN and profile fetch as phone

### Employee-ID Signup
1. `POST /api/v3/public/account/signup/employee-id` → Get auth_challenge (employee lookup)
2. `POST /api/v2/public/account/signup/employee-id/add-phone?action=request` → Get ref_code
3. `POST /api/v2/public/account/signup/employee-id/add-phone?action=verify` → Get Firebase token
4. Same PIN and profile fetch as phone

---

## 9. Key Design Insights

### Why Identifiers Are Generated Differently
- **Phone**: Generated each run (no collisions with paycycle constraints)
- **Line ID**: Fixed identifier (serial mode, reused across runs)
- **Email**: Fixed for line profile (used for pre-seed lookup)
- **Employee ID**: Generated each run (unique lookup identifier)

### Why Cleanup Steps Are Best-Effort
- Pre-seed: Previous test might have crashed, leaving stale data
- Cleanup should tolerate missing data (404 errors OK)
- Never throw → allows test to proceed even if cleanup partial

### Why Parallelism is Marked
- **Phone profile**: `parallelism: 'safe'` → Can run in parallel (unique identifiers)
- **Line profile**: `parallelism: 'must-be-serial'` → Serial only (fixed identifiers)
- **Employee-ID**: `parallelism: 'safe'` → Can run in parallel (unique identifiers)

### Current Testing Gap
- Tests validate signup_at is set (exists, not null)
- Tests don't validate it's RESET between runs
- Tests don't validate it's cleared on cleanup
- This is why conflicts happen on re-runs

---

## 10. Recommendations for Fixing signup_at Conflicts

### Short-term Fix (No Code Changes)
1. **For Phone/Employee-ID profiles**: Already safe (unique identifiers per run)
2. **For Line profile**: 
   - Accept `must-be-serial` limitation
   - OR manually cleanup between line test runs
   - OR use database direct cleanup in afterEach

### Medium-term Fix (Recommended)
1. Add hard-reset cleanup step using direct DB queries
2. Create helper function in test-helpers.ts
3. Call after profile-specific cleanup to ensure complete reset
4. Use in post-test cleanup phase

```typescript
// In profile definitions:
cleanupSteps: [
  cleanupEmployee,                    // Profile-specific cleanup via API
  hardResetUser                       // Database-level cleanup
]

async function hardResetUser(request, ctx): Promise<void> {
  if (!ctx.employee.user_id) return;  // Pre-seed: no user yet
  
  try {
    await deleteEmployeeByUserId(Number(ctx.employee.user_id));
  } catch (err) {
    console.warn('Hard reset cleanup failed (ignored)', err);
  }
}
```

### Long-term Fix
1. Investigate Admin API `/delete` endpoint behavior
2. Verify it properly cascades deletes across all tables
3. If not: Fix backend or add explicit delete steps
4. Consider soft-delete vs hard-delete strategy

---

## 11. File Paths Reference

```
/api/helpers/
  ├── seed.ts                         # Seeding orchestration
  ├── employee.ts                     # Admin API CRUD
  ├── test-setup.ts                   # Beforeach/afterEach helpers
  ├── identifiers.ts                  # Identifier generation
  └── profiles/
      ├── phone.ts                    # Phone signup profile
      ├── line.ts                     # LINE signup profile
      └── employee-id.ts              # Employee-ID signup profile

/api/tests/signup/
  ├── signup-phone.test.ts            # Phone signup tests
  ├── signup-line.test.ts             # LINE signup tests
  └── signup-employee-id.test.ts      # Employee-ID signup tests

/shared/
  ├── db.ts                           # Database connection
  └── test-helpers.ts                 # Utility DB functions
```

