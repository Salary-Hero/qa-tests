# Signup Infrastructure - Key Findings Summary

## Quick Reference

### 1. What Gets Created (Database Tables)

#### During Employee Seeding (Pre-Test)
| Table | PK | Created By | Key Columns |
|-------|-----|-----------|------------|
| `users` | user_id | Admin API | email, first_name, last_name, status |
| `employment` | employment_id | Admin API | legacy_user_id (FK→users), company_id, employee_id, user_uid (NULL) |

#### During Signup Flow (Test Execution)
| Table | PK | Created By | Key Columns |
|-------|-----|-----------|------------|
| `user_identity` | user_uid | Signup API | legacy_user_id (FK→users), phone_number, created_at, updated_at |

#### After PIN Creation
- `signup_at` timestamp is SET somewhere (likely in `user_identity` or user profile table)
- Tests verify: `profile.signup_at` is NOT NULL after PIN creation

---

### 2. Cleanup Mechanism

#### Current Flow
1. **Pre-seed cleanup** (idempotent, best-effort)
   - Runs before creating employee
   - Tolerates "not found" errors
   - Allows recovery from failed previous test

2. **Profile-specific cleanup step**
   - Each profile defines: `cleanupSteps: CleanupStep[]`
   - Phone: searches by phone → deletes employee
   - Line: searches by email (not phone!) → deletes employee
   - Employee-ID: searches by employee_id → deletes employee

3. **API-based deletion**
   - `DELETE /api/v1/admin/employees/{userId}`
   - Backend handles cascading deletes (assumption)
   - Returns 404 if not found (safe)

#### What's NOT Cleared
- `signup_at` timestamp may persist in user_identity
- OR user_identity record may not be deleted
- Tests don't validate cleanup removes this timestamp

---

### 3. The signup_at Problem

#### Why It Happens
```
Test 1 runs:
  ✓ User created in users table
  ✓ User created in employment table
  ✓ User created in user_identity table with signup_at = NOW()

Test 1 cleanup:
  ✗ deleteEmployee() called
  ✗ But user_identity.signup_at NOT cleared (or table not deleted)
  ✓ Test ends

Test 2 runs (same phone/email):
  ✗ Pre-seed cleanup finds user from Test 1
  ✗ Tries to delete via API
  ✗ But user_identity.signup_at persists
  ✓ Employee created fresh
  ✓ Signup flow runs
  ✗ Create PIN endpoint: signup_at already set
  ✗ CONFLICT - test fails
```

#### Root Cause
- Admin API `DELETE /admin/employees/{userId}` doesn't fully clear signup state
- Tests use Admin API for cleanup (can't control cascade behavior)
- No hard-reset mechanism via direct database cleanup

---

### 4. Identifier Strategies

| Profile | Identifiers | Strategy | Parallelism | Lookup Method |
|---------|-------------|----------|-------------|---------------|
| **Phone** | phone (new each run) | generated | safe | phone number |
| **Line** | line_id (fixed), email (fixed), phone (new) | fixed | must-be-serial | email (phone not searchable) |
| **Employee-ID** | employee_id (new), national_id (new) | generated | safe | employee_id |

**Note**: Line profile is serial because it reuses the same line_id across runs.

---

### 5. File Organization & Responsibilities

#### Core Files
```
seed.ts                    → Orchestrate: pre-cleanup → create → post-cleanup
employee.ts                → Admin API CRUD (create, delete, search)
identifiers.ts             → Generate unique test data
test-setup.ts              → Wrap seed/cleanup in beforeEach/afterEach
```

#### Profile Files
```
profiles/phone.ts          → Phone signup specifics
profiles/line.ts           → LINE signup specifics
profiles/employee-id.ts    → Employee-ID signup specifics
```

#### Test Files
```
tests/signup/signup-phone.test.ts
tests/signup/signup-line.test.ts
tests/signup/signup-employee-id.test.ts
```

#### Database Access
```
db.ts                      → DB connection + query() function
test-helpers.ts            → Utility functions including deleteEmployeeByUserId()
```

---

### 6. The Gap: What's Missing

#### Currently Available
- ✓ API-based employee creation via Admin API
- ✓ API-based employee deletion via Admin API  
- ✓ Database connection available (`db.ts`)
- ✓ Database deletion helper available (`deleteEmployeeByUserId()` in test-helpers.ts)

#### Not Used by Signup Tests
- ✗ Direct database cleanup (test-helpers.ts not imported in profiles)
- ✗ Hard-reset mechanism to clear all signup state
- ✗ Validation that signup_at is cleared on cleanup

#### The Solution
The infrastructure EXISTS to do hard reset via:
```typescript
import { deleteEmployeeByUserId } from '../../../shared/test-helpers'

async function hardResetUser(request: APIRequestContext, ctx: SeedContext): Promise<void> {
  if (!ctx.employee.user_id) return;
  try {
    await deleteEmployeeByUserId(Number(ctx.employee.user_id));
  } catch (err) {
    console.warn('Hard reset failed (ignored)', err);
  }
}
```

But it's not called in the signup profile cleanup steps.

---

### 7. Database Deletion Order (From test-helpers.ts)

```typescript
// Respects foreign key constraints:
// employment → user_identity → users

const employmentResult = await query('DELETE FROM employment WHERE legacy_user_id = $1', [userId]);
const identityResult = await query('DELETE FROM user_identity WHERE legacy_user_id = $1', [userId]);
const usersResult = await query('DELETE FROM users WHERE user_id = $1', [userId]);
```

---

### 8. Tables Affected by Hard Reset

| Table | Affected | Operation | FK Dependency |
|-------|----------|-----------|--------------|
| `employment` | YES | DELETE | legacy_user_id → users |
| `user_identity` | YES | DELETE | legacy_user_id → users |
| `users` | YES | DELETE | - |

---

### 9. Phone Number Generation

```typescript
export function generatePhone(): string {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 100)}`.slice(-8)
  return `08${suffix}`
}
```

**Result**: Unique phone per run (timestamp + random)
**Example**: `0812163456789` (8-digit suffix from timestamp)

---

### 10. Cleanup Failure Scenarios

### Scenario A: Pre-seed finds no user
```
findEmployeeByIdentifier(phone) → returns null
deleteEmployee() → skipped
No error thrown
Test proceeds (but stale data remains)
```

### Scenario B: findEmployeeByIdentifier searches wrong field
```
Line profile uses email for search (phone is generated each run)
If email lookup fails, stale line_id record stays
Next run: Same line_id found for different user?
Conflict or identity confusion
```

### Scenario C: Admin API delete is soft-delete
```
deleteEmployee() removes record from users/employment
But user_identity or signup_at not cleaned
Test reuses same identifier
Signup flow: signup_at already exists
PIN creation fails or unexpected state
```

---

### 11. Test Expectations

All three signup flows check:
```typescript
expect(body.profile.signup_at).not.toBeNull()
```

This validates signup_at EXISTS but doesn't validate:
- It was newly set (not from previous test)
- It matches current signup time (not stale)
- All related records are fresh (not reused)

---

### 12. Why This Matters

#### Impact
- Signup tests may randomly fail when run multiple times
- Line profile forces serial execution (performance cost)
- No confidence in test isolation/idempotency
- Bug might not reproduce in CI but fails locally on re-runs

#### The Fix
Add one cleanup step using existing infrastructure:

```typescript
// In each profile's cleanupSteps array:
cleanupSteps: [
  cleanupEmployee,        // Current: Admin API delete
  hardResetUser,          // New: Database hard reset
]
```

This ensures:
1. API-level cleanup first (if employee exists in search)
2. Database cleanup second (nuclear option for any stragglers)
3. signup_at and all related records gone
4. Tests are truly idempotent

---

### 13. Infrastructure Maturity Assessment

| Component | Status | Quality | Notes |
|-----------|--------|---------|-------|
| Seeding | ✓ Complete | Good | Well-structured, best-effort error handling |
| Employee creation | ✓ Complete | Good | Via Admin API, clear payload building |
| Identifier generation | ✓ Complete | Good | Unique per run (except Line profile) |
| API-based cleanup | ✓ Complete | Partial | Doesn't fully reset signup state |
| DB-based cleanup | ✓ Available | Not used | Exists in test-helpers but not imported |
| Hard-reset mechanism | ✗ Missing | N/A | Can be added using existing test-helpers |

---

### 14. Quick Links to Files

- Full Seeding Implementation: `/api/helpers/seed.ts` (127 lines)
- Employee CRUD: `/api/helpers/employee.ts` (205 lines)
- Phone Profile: `/api/helpers/profiles/phone.ts` (58 lines)
- Line Profile: `/api/helpers/profiles/line.ts` (62 lines)
- Employee-ID Profile: `/api/helpers/profiles/employee-id.ts` (100 lines)
- Database Deletion Helper: `/shared/test-helpers.ts` (146 lines, line 114-146)
- Database Connection: `/shared/db.ts` (30 lines)

