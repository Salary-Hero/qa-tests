# QA Engineering Lead - Best Practices

This skill guide captures QA engineering excellence standards - the practices every QA engineer should follow and role models should demonstrate.

---

## 1. Security Standards

### 1.1 No Credentials in Any File
**Brief**: Never write passwords, API keys, or secrets in code, tests, or documentation.

**Why**: Credentials in files get committed to version control, exposing them to anyone with repository access.

**Example**:
```typescript
// ❌ BAD
const password = "your-secret-password";
const apiKey = "your-api-key-here";

// ✅ GOOD
const password = process.env.ADMIN_PASSWORD;
const apiKey = process.env.FIREBASE_API_KEY;
```

**Code Reference**: `shared/auth.ts:1-10` - Uses `process.env.ADMIN_EMAIL` and `process.env.ADMIN_PASSWORD`

---

### 1.2 Environment Variables Only
**Brief**: Load all secrets from environment variables via `.env` file (protected by `.gitignore`).

**Why**: `.env` is git-ignored, keeping secrets local and safe.

**Example**:
```typescript
// shared/env-config.ts
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD required in .env');
}
```

**Code Reference**: `shared/env-config.ts:1-30` - Centralized environment variable loading

---

### 1.3 .gitignore Verification Before Changes
**Brief**: Always verify `.env` and other sensitive files are in `.gitignore` before making code changes.

**Why**: Prevents accidental credential commits.

**Example**:
```bash
# Check .gitignore before starting work
grep "\.env" .gitignore
# Output: .env

# Verify .env is not committed
git status | grep .env
# (should show nothing if properly ignored)
```

**Code Reference**: `.gitignore:1` - Contains `.env` entry

---

### 1.4 Code Review - Security Check First
**Brief**: Review security before functionality in all code reviews.

**Checklist**:
- [ ] No hardcoded credentials
- [ ] No API keys in strings
- [ ] No passwords in examples
- [ ] Environment variables used correctly
- [ ] `.env` not in git history

**Code Reference**: `shared/auth.ts` - Example of secure credential handling

---

## 2. Code Quality Standards

### 2.1 DRY Principle - Extract Duplicates
**Brief**: Never repeat code twice. Extract to helper functions immediately.

**Why**: Duplicated code means bugs must be fixed in multiple places.

**Example**:
```typescript
// ❌ BAD - Duplicated 4 times in test file
await query('DELETE FROM employment WHERE legacy_user_id = $1', [userId]);
await query('DELETE FROM user_identity WHERE legacy_user_id = $1', [userId]);
await query('DELETE FROM users WHERE user_id = $1', [userId]);

// ✅ GOOD - Single helper function
await deleteEmployeeByUserId(userId);
```

**Code Reference**: `shared/test-helpers.ts:127-163` - `deleteEmployeeByUserId()` function consolidates cleanup logic

---

### 2.2 SOLID Principles - Single Responsibility
**Brief**: Each function does one thing well. Don't mix concerns.

**Why**: Single responsibility makes code testable, maintainable, and reusable.

**Example**:
```typescript
// ❌ BAD - Mixed concerns
async function createAndUpdateEmployee(data) {
  const created = await createEmployee(data);
  await updateEmployee(created.id, data);
  await logToDatabase(created.id);
  await sendEmail(created.email);
  return created;
}

// ✅ GOOD - Single responsibility
async function createEmployee(data) {
  // Only handles creation
  return await createEmployeeViaAPI(request, token, data);
}
```

**Code Reference**: `shared/employee-api.ts:82-105` - `createEmployeeViaAPI()` has single responsibility

---

### 2.3 Type Safety - TypeScript Strict Mode
**Brief**: Use TypeScript types to catch errors at compile time, not runtime.

**Why**: Prevents runtime type errors and makes code self-documenting.

**Example**:
```typescript
// ❌ BAD - No types
export function deleteEmployeeViaAPI(request, token, userId) {
  // What types are these? Runtime will fail if wrong
}

// ✅ GOOD - Explicit types
export async function deleteEmployeeViaAPI(
  request: APIRequestContext,
  token: string,
  userId: number
): Promise<void> {
  // Types documented, compile-time checking
}
```

**Code Reference**: `shared/employee-api.ts:148-166` - Strong typing on all API functions

---

### 2.4 Error Handling - Meaningful Messages
**Brief**: Errors should explain what went wrong and why, not just fail silently.

**Why**: Developers can debug quickly with clear error context.

**Example**:
```typescript
// ❌ BAD - Silent failure
if (!response.ok) {
  throw new Error('Failed');
}

// ✅ GOOD - Meaningful context
if (!response.ok || !response.body.information.user_id) {
  throw new Error(
    `Failed to create employee: ${response.status} - ${JSON.stringify(response.body)}`
  );
}
```

**Code Reference**: `shared/employee-api.ts:98-99` - Detailed error messages with status and body

---

### 2.5 Single Responsibility Functions
**Brief**: Each function should have one reason to change.

**Why**: Makes code easier to test, debug, and reuse.

**Example**:
```typescript
// ✅ GOOD - Single responsibilities
async function deleteEmployeeByUserId(userId: number) {
  // Only deletes employee records
}

async function deleteEmployeeViaAPIWithFallback(request, token, userId) {
  // Only handles API call with fallback
}

// Each function has one job
```

**Code Reference**: `shared/test-helpers.ts:127-163` and `shared/employee-api.ts:195-224`

---

## 3. Testing Standards

### 3.1 Test API Behavior, Not Database State
**Brief**: Tests should call the API, not query the database directly. Database queries only for verification/cleanup.

**Why**: Tests API behavior - what users actually experience. Database queries show what happened, not if it worked.

**Example**:
```typescript
// ❌ BAD - Testing database, not API
const payload = { first_name: 'John' };
await query('INSERT INTO users ...', [payload]); // Direct DB
const result = await query('SELECT * FROM users WHERE id = ?');
expect(result.first_name).toBe('John');

// ✅ GOOD - Testing API
const created = await createEmployeeViaAPI(request, token, payload); // API call
expect(created.information.first_name).toBe('John'); // API response
const dbUser = await getUserById(created.information.user_id); // Verify persistence
expect(dbUser.first_name).toBe('John');
```

**Code Reference**: `api/tests/employees/employee.spec.ts:42-62` - CREATE test follows API → verify → cleanup pattern

---

### 3.2 Happy Path Coverage for Regression
**Brief**: Tests should cover the normal, expected flow to catch regressions before production.

**Why**: Regression tests prevent breaking changes from reaching users.

**Tests**:
1. CREATE - New employee via API
2. READ - Retrieve complete data
3. UPDATE - Modify fields via API
4. DELETE - Remove via API
5. BATCH - Multiple operations

**Code Reference**: `api/tests/employees/employee.spec.ts:26-278` - 5 comprehensive happy path tests

---

### 3.3 Clear Test Naming and Purpose
**Brief**: Test names should explain what's being tested and expected outcome.

**Why**: Developers understand test purpose instantly without reading code.

**Example**:
```typescript
// ❌ BAD - Unclear purpose
test('test1', async () => { ... })
test('employee', async () => { ... })

// ✅ GOOD - Clear purpose
test('CREATE - Create new employee via API', async () => { ... })
test('UPDATE - Modify employee first_name via PATCH API', async () => { ... })
```

**Code Reference**: `api/tests/employees/employee.spec.ts:28-29` - Descriptive test names

---

### 3.4 Deterministic and Repeatable Tests
**Brief**: Tests produce same result every time they run, independent of order or previous test state.

**Why**: Flaky tests erode confidence and waste debugging time.

**Practices**:
- Unique data per test (generated IDs)
- Proper cleanup in `finally` block
- No test interdependencies
- Serial execution if needed

**Code Reference**: `api/tests/employees/employee.spec.ts:27` - `test.describe.configure({ mode: 'serial' })` ensures proper ordering

---

### 3.5 Verify Infrastructure Before Writing Tests
**Brief**: Check API is healthy, database is running, credentials are set before writing test code.

**Why**: No point writing tests if infrastructure isn't available.

**Checklist**:
- [ ] API endpoints responding
- [ ] Database connection working
- [ ] Environment variables set
- [ ] Dependencies installed
- [ ] Type checking passes

**Code Reference**: `shared/env-config.ts:45-65` - `validateApiConfig()` checks infrastructure before tests

---

## 4. Code Review Checklist

When reviewing QA code:

### Security Review
- [ ] No credentials in code/docs/examples
- [ ] All secrets from environment variables
- [ ] `.env` in `.gitignore`
- [ ] No API keys exposed
- [ ] No passwords in strings

### Code Quality Review
- [ ] No duplicate code (DRY principle)
- [ ] Single responsibility per function
- [ ] Type safety (TypeScript)
- [ ] Meaningful error messages
- [ ] SOLID principles followed

### Testing Review
- [ ] Tests API, not database operations
- [ ] Happy path coverage adequate
- [ ] Clear test naming and purpose
- [ ] Deterministic (no flakiness)
- [ ] Proper cleanup/teardown

### Documentation Review
- [ ] Only created when requested
- [ ] No credentials in documentation
- [ ] Code examples with line references
- [ ] Clear and brief

---

## 5. Common Mistakes to Avoid

### 5.1 Creating Documentation Without Permission
**Mistake**: Writing markdown files without user request.

**Why It's Wrong**: Clutters repo, assumes user wants documentation, violates DRY with repetition.

**Prevention**: Always ask "Would you like documentation?" before creating.

**Example of Doing It Right**:
```
Instead of: Creating 7 markdown files silently
Do this: "I've made these changes. Would you like me to document them?"
```

---

### 5.2 Exposing Credentials in Documentation
**Mistake**: Including credential examples, even fake ones, in documentation or security audits.

**Why It's Wrong**: Defeats security purpose, trains poor habits, risks real credentials appearing.

**Prevention**: Reference `.env` variables, never show actual or example values.

**Example of Doing It Right**:
```
❌ BAD: "Use ADMIN_PASSWORD=your-secret in .env"
✅ GOOD: "Set ADMIN_PASSWORD in .env file (actual value from secure storage)"
```

---

### 5.3 Assuming User Intent Without Asking
**Mistake**: Making decisions about scope/format without clarifying with user.

**Why It's Wrong**: Wastes time on wrong solution, requires rework.

**Prevention**: Ask clarifying questions before deciding.

**Example Questions**:
- "Do you want documentation? If yes, what detail level?"
- "Should this helper handle X scenario?"
- "Do you prefer comprehensive or minimal implementation?"

---

### 5.4 Not Asking Clarifying Questions
**Mistake**: Proceeding with implementation based on incomplete understanding.

**Why It's Wrong**: Leads to wrong solution, requires revision.

**Prevention**: Ask before acting.

**Key Questions to Ask**:
- What's the user's actual need?
- What's the scope?
- What format/detail is preferred?
- What's the priority?

---

### 5.5 Duplicating Code Instead of Extracting Helpers
**Mistake**: Copying code in multiple places instead of extracting to helper.

**Why It's Wrong**: Maintenance nightmare, inconsistency, bugs in multiple places.

**Prevention**: Scan for duplicates in every file. Extract immediately.

**Example**:
```
When you see the same SQL query twice, extract it.
When you see the same setup twice, extract it.
When you see the same cleanup twice, extract it.
```

**Code Reference**: `shared/test-helpers.ts:127-163` - Extracted cleanup logic used in all tests

---

### 5.6 Writing Tests Before Verifying Infrastructure
**Mistake**: Writing test code when API/database isn't available.

**Why It's Wrong**: Tests fail mysteriously, can't verify they work.

**Prevention**: Health check before test development.

**Process**:
1. Verify API is responding
2. Check database is connected
3. Validate credentials are set
4. Test key endpoint manually
5. THEN write test code

---

## 6. Best Practices Summary

| Principle | What to Do | What NOT to Do |
|-----------|-----------|----------------|
| **Security** | Use environment variables | Hardcode credentials |
| **DRY** | Extract duplicates to helpers | Copy code multiple times |
| **Types** | Use TypeScript strictly | Rely on runtime type checking |
| **Testing** | Test API behavior | Test database directly |
| **Errors** | Meaningful error messages | Silent failures |
| **Docs** | Create only when asked | Create proactively |
| **Questions** | Ask before deciding | Assume user intent |

---

## 7. Implementation Checklist

Use this before every QA test implementation:

- [ ] Verified `.env` is in `.gitignore`
- [ ] No credentials in any file
- [ ] All environment variables defined
- [ ] Infrastructure verified (API, DB responding)
- [ ] TypeScript types defined
- [ ] No duplicate code (DRY check)
- [ ] Tests call API, not database
- [ ] Error messages are meaningful
- [ ] Tests are deterministic
- [ ] Cleanup is proper (finally blocks)
- [ ] Code review checklist passed
- [ ] Only create docs if requested

---

**Last Updated**: April 21, 2026
**Maintain By**: Team consensus, quarterly review
**Questions?**: Refer to `.opencode/plans/QA_LEAD_STANDARDS.md` for context and lessons learned
