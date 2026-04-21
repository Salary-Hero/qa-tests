# Test Cases Specification

Detailed specifications for all test cases including IDs, descriptions, preconditions, test steps, expected outcomes, and dependencies.

## Test Case Matrix Overview

| ID | Test Name | Category | Status | Est. Time | Dependencies |
|----|-----------|----------|--------|-----------|--------------|
| TC-EMP-001 | CREATE - Create new employee | Employee CRUD | ✅ PASS | 4-6s | Admin auth |
| TC-EMP-002 | READ - Retrieve employee data | Employee CRUD | ✅ PASS | 4-5s | Admin auth |
| TC-EMP-003 | UPDATE - Modify employee field | Employee CRUD | ✅ PASS | 5-7s | Admin auth, CREATE |
| TC-EMP-004 | DELETE - Remove employee | Employee CRUD | ✅ PASS | 4-6s | Admin auth, CREATE |
| TC-EMP-005 | BATCH - Create/update multiple | Employee CRUD | ✅ PASS | 15-20s | Admin auth |
| TC-SIGN-001 | Phone signup - Full flow | Signup | ✅ PASS | 9-12s | Phone number |
| TC-SIGN-002 | LINE signup - Full flow | Signup | ✅ PASS | 15-18s | LINE token |
| TC-SIGN-003 | Employee ID (Nat'l ID) signup | Signup | ✅ PASS | 10-14s | Employee data |
| TC-SIGN-004 | Employee ID (Passport) signup | Signup | ✅ PASS | 10-14s | Employee data |

---

## Employee CRUD Test Cases

### TC-EMP-001: CREATE - Create New Employee

**Test ID:** `TC-EMP-001`
**Category:** Employee CRUD
**Priority:** 🔴 Critical
**Status:** ✅ Passing

**Objective:**
Verify that a new employee can be created via API with all required information and response contains user_id.

**File Location:**
`api/tests/employees/employee.spec.ts:27`

**Preconditions:**
- Admin authentication token obtained
- Valid employee data payload prepared
- Company ID exists (128)
- Phone number is unique
- Email is unique

**Test Steps:**

```
1. Login as admin to get bearer token
2. Prepare employee payload:
   - first_name: "Alice"
   - last_name: "Smith"
   - Generated phone: 09{timestamp}{random}
   - Generated email: qa-signup-{timestamp}-{random}@test.example.com
   - employee_id: EMP{timestamp}{random}
   - salary: 30000
   - company_id: 128
   - paycycle_id: 3661
   - status: "active"
3. POST /v1/admin/account/employee/128
4. Receive response with status 201
5. Verify response contains:
   - information.user_id (number)
   - information.first_name = "Alice"
   - information.last_name = "Smith"
   - information.phone = generated value
   - information.employee_id exists
6. Verify database - Query users table:
   - SELECT * FROM users WHERE user_id = ?
   - Confirm first_name = "Alice"
   - Confirm last_name = "Smith"
   - Confirm status = "active"
7. Cleanup: Delete created employee via API
```

**Expected Outcome:**
- ✅ HTTP 201 Created
- ✅ Response body contains user_id
- ✅ Response matches EmployeeResponse schema
- ✅ Database query returns matching record
- ✅ All assertions pass
- ✅ Cleanup successful

**Pass Criteria:**
```
expect(response.status).toBe(201)
expect(response.information.user_id).toBeDefined()
expect(response.information.first_name).toBe('Alice')
expect(dbUser.status).toBe('active')
```

**Failure Points:**
- ❌ HTTP 400/403: Invalid payload or permission denied
- ❌ HTTP 409: Duplicate email/phone/employee_id
- ❌ Missing user_id in response
- ❌ Database doesn't have matching record
- ❌ Field values don't match

**Notes:**
- Tests all required fields in single operation
- Verifies both API response and database persistence
- Foundation for other CRUD tests

---

### TC-EMP-002: READ - Retrieve Complete Employee Data

**Test ID:** `TC-EMP-002`
**Category:** Employee CRUD
**Priority:** 🔴 Critical
**Status:** ✅ Passing

**Objective:**
Verify that complete employee data can be retrieved and contains all required fields.

**File Location:**
`api/tests/employees/employee.spec.ts:71`

**Preconditions:**
- Admin authentication token obtained
- Valid employee created via TC-EMP-001
- user_id returned from create operation

**Test Steps:**

```
1. Login as admin to get bearer token
2. Create test employee:
   - first_name: "Bob"
   - last_name: "Johnson"
   - Generated unique email and phone
3. Store user_id from response
4. Verify response (from CREATE, not dedicated GET):
   - Check user_id matches
   - Check first_name = "Bob"
   - Check last_name = "Johnson"
   - Check phone matches generated value
5. Verify all required fields present:
   - email, company_id, employee_id
   - paycycle_id, status, salary
6. Database verification:
   - Query users table by user_id
   - Verify first_name = "Bob"
   - Verify last_name = "Johnson"
7. Cleanup: Delete employee via API
```

**Expected Outcome:**
- ✅ HTTP 201 with complete data
- ✅ All required fields present in response
- ✅ Field types are correct
- ✅ Database query returns same data
- ✅ All assertions pass

**Pass Criteria:**
```
expect(response.information.user_id).toBe(userId)
expect(response.information.first_name).toBe('Bob')
expect(response.information.last_name).toBe('Johnson')
expect(response.information).toHaveProperty('email')
expect(response.information).toHaveProperty('company_id')
expect(response.information).toHaveProperty('paycycle_id')
expect(dbUser.first_name).toBe('Bob')
```

**Failure Points:**
- ❌ Missing any required field in response
- ❌ Field values incorrect
- ❌ Database record incomplete
- ❌ Data type mismatch (e.g., string instead of number)

**Notes:**
- Tests response completeness from create operation
- No dedicated GET endpoint in current API
- Validates data integrity across both API and DB

---

### TC-EMP-003: UPDATE - Modify Employee First Name

**Test ID:** `TC-EMP-003`
**Category:** Employee CRUD
**Priority:** 🔴 Critical
**Status:** ✅ Passing

**Objective:**
Verify that employee data can be updated via PATCH and changes persist.

**File Location:**
`api/tests/employees/employee.spec.ts:119`

**Preconditions:**
- Admin authentication token obtained
- Valid employee created with initial data
- user_id and original employee information available
- Update payload contains only writable fields

**Test Steps:**

```
1. Login as admin to get bearer token
2. Create initial employee:
   - first_name: "Charlie"
   - last_name: "Brown"
3. Store user_id and original data
4. Prepare update payload:
   - Build update with only writable fields:
     * first_name: "Charles" (changed)
     * Keep all other fields from original
   - Exclude read-only fields:
     * Do NOT include user_id
     * Do NOT include created_at, updated_at
     * Do NOT include computed fields
5. PATCH /v1/admin/account/employee/128/{userId}
6. Receive response with status 200
7. Verify response contains updated data:
   - information.first_name = "Charles"
   - information.user_id = original userId
   - information.last_name = "Brown" (unchanged)
8. Database verification:
   - Query users by user_id
   - Confirm first_name = "Charles"
   - Confirm last_name = "Brown" (unchanged)
9. Cleanup: Delete employee via API
```

**Expected Outcome:**
- ✅ HTTP 200 OK
- ✅ Response shows updated field
- ✅ Unchanged fields retain original values
- ✅ Database reflects update
- ✅ All assertions pass

**Pass Criteria:**
```
expect(response.status).toBe(200)
expect(response.information.first_name).toBe('Charles')
expect(response.information.user_id).toBe(userId)
expect(response.information.last_name).toBe('Brown')
expect(dbUser.first_name).toBe('Charles')
expect(dbUser.last_name).toBe('Brown')
```

**Failure Points:**
- ❌ HTTP 403: Sending read-only fields (e.g., user_id)
- ❌ HTTP 404: Employee not found
- ❌ Updated field shows wrong value
- ❌ Database update didn't persist
- ❌ Unintended field changes

**Critical Detail:**
Must NOT send these fields in PATCH request:
```typescript
// ❌ WRONG - Will cause 403
{
  information: {
    user_id: 1234,        // Read-only!
    first_name: 'Charles',
    created_at: '2026-...' // Read-only!
  }
}

// ✅ CORRECT - Only writable fields
{
  information: {
    first_name: 'Charles'
  }
}
```

**Notes:**
- Most common CRUD operation
- Tests both update and persistence
- Demonstrates field filtering (read-only detection)

---

### TC-EMP-004: DELETE - Remove Employee

**Test ID:** `TC-EMP-004`
**Category:** Employee CRUD
**Priority:** 🔴 Critical
**Status:** ✅ Passing

**Objective:**
Verify that an employee can be deleted and all related records are removed.

**File Location:**
`api/tests/employees/employee.spec.ts:166`

**Preconditions:**
- Admin authentication token obtained
- Valid employee created and exists in database
- user_id available for deletion

**Test Steps:**

```
1. Login as admin to get bearer token
2. Create test employee:
   - first_name: "Diana"
   - last_name: "Prince"
3. Store user_id from response
4. Verify employee exists in database:
   - Query users WHERE user_id = ?
   - Confirm record found
   - Confirm first_name = "Diana"
5. DELETE /v1/admin/account/employee/{userId}
6. Receive response with status 200
7. Verify delete success message in response
8. (Optional) Verify cascading deletes:
   - Query users table - should return 0 rows
   - Query employment table - should return 0 rows
   - Query user_identity table - should return 0 rows
```

**Expected Outcome:**
- ✅ HTTP 200 OK
- ✅ Response confirms successful deletion
- ✅ Subsequent database queries return no records
- ✅ All cascading deletes completed
- ✅ No orphaned records remain

**Pass Criteria:**
```
expect(response.status).toBe(200)
expect(dbUserBefore).toBeDefined()
// After delete (optional verification)
expect(dbUserAfter).toBeNull()
```

**Failure Points:**
- ❌ HTTP 404: User not found
- ❌ HTTP 403: Permission denied
- ❌ Database still contains user record
- ❌ Employment records not deleted (cascade failed)

**Cascading Deletes:**
Backend automatically deletes:
- ✅ `users` table (primary)
- ✅ `employment` table (FK cascade)
- ✅ `user_identity` table (FK cascade)
- ✅ `user_balance` table (FK cascade)
- ✅ `user_address` table (FK cascade)
- ✅ `user_bank` table (FK cascade)

**Notes:**
- Depends on proper foreign key constraints
- Must not leave orphaned records
- Important for test cleanup

---

### TC-EMP-005: BATCH - Create and Update Multiple Employees

**Test ID:** `TC-EMP-005`
**Category:** Employee CRUD
**Priority:** 🟡 High
**Status:** ✅ Passing

**Objective:**
Verify that multiple employees can be created and updated in sequence.

**File Location:**
`api/tests/employees/employee.spec.ts:197`

**Preconditions:**
- Admin authentication token obtained
- System can handle multiple concurrent operations
- Sufficient unique identifiers available

**Test Steps:**

```
1. Login as admin to get bearer token
2. Batch Create - Create 3 employees in loop:
   - Employee 1: first_name="Eve", last_name="TestBatch"
   - Employee 2: first_name="Frank", last_name="TestBatch"
   - Employee 3: first_name="Grace", last_name="TestBatch"
   - Each has unique phone, email, employee_id
   - Store all user_ids
3. Verify create successful:
   - Expect 3 user_ids returned
   - Expect all responses status 201
4. Batch Update - Update all 3 in loop:
   - Eve_Updated, Frank_Updated, Grace_Updated
   - Use PATCH for each
5. Verify updates:
   - Each response status 200
   - first_name shows "_Updated" suffix
6. Database verification:
   - Query each user_id
   - Verify all updates persisted
   - Check first_name includes "_Updated"
7. Cleanup: Delete all 3 via API in loop
```

**Expected Outcome:**
- ✅ All 3 creates succeed (3x HTTP 201)
- ✅ All 3 updates succeed (3x HTTP 200)
- ✅ Database shows all changes
- ✅ All cleanup operations succeed
- ✅ No orphaned records remain

**Pass Criteria:**
```
expect(userIds.length).toBe(3)
for (let i = 0; i < 3; i++) {
  expect(updated[i].information.first_name)
    .toBe(names[i] + '_Updated')
  expect(dbUsers[i].first_name)
    .toBe(names[i] + '_Updated')
}
```

**Failure Points:**
- ❌ Any create fails
- ❌ Any update fails
- ❌ Less than 3 employees created
- ❌ Updates don't persist
- ❌ Cleanup leaves orphaned records
- ❌ Unique constraint violations

**Notes:**
- Tests system scalability
- Verifies operations handle multiple records
- Important for production workloads

---

## Signup Test Cases

### TC-SIGN-001: Phone Signup - Complete Flow

**Test ID:** `TC-SIGN-001`
**Category:** Signup Workflows
**Priority:** 🔴 Critical
**Status:** ✅ Passing

**Objective:**
Verify complete phone number signup flow including OTP, Firebase auth, and PIN creation.

**File Location:**
`api/tests/signup/signup-phone.test.ts:32`

**Preconditions:**
- Fresh phone number generated: `09{timestamp}{random}`
- Fresh email generated: `qa-signup-*@test.example.com`
- Fresh employee_id generated: `EMP{timestamp}{random}`
- Test credentials configured:
  - OTP: "123456"
  - PIN: "999999"
- Seeded employee created with phone signup profile

**Test Steps:**

```
STEP 1: Request OTP
- POST /v1/public/signup/phone/otp/request
- Data: { phone: "09XXXXXXXXX" }
- Expected: HTTP 200
- Response contains:
  * is_signup: false
  * next_state: "signup.phone.verify"
  * verification_info.ref_code

STEP 2: Verify OTP
- POST /v1/public/signup/phone/otp/verify
- Params: ?verification_method=otp&action=verify&...
- Data: { phone, ref_code, code: "123456" }
- Expected: HTTP 200
- Response contains:
  * is_signup: true
  * next_state: "user.profile"
  * verification_info.token (Firebase custom token)

STEP 3: Firebase Sign In with Custom Token
- Call firebaseSignIn(customToken)
- Expected: HTTP 200
- Response contains:
  * refreshToken
  * idToken (pre-PIN)

STEP 4: Get Firebase ID Token (pre-PIN)
- Call firebaseRefreshToken(refreshToken)
- Expected: HTTP 200
- Response contains:
  * id_token (pre-PIN)

STEP 5: Create PIN
- POST /v1/public/signup/create-pin
- Headers: Authorization with id_token
- Data: { pincode: "999999" }
- Expected: HTTP 200
- Response: { message: "Create PIN successfully" }

STEP 6: Get Firebase ID Token (post-PIN)
- Call firebaseRefreshToken(refreshToken)
- Expected: HTTP 200
- Response contains:
  * id_token (post-PIN, different from pre-PIN)

STEP 7: Get Profile
- GET /v1/public/signup/profile
- Headers: Authorization with id_token (post-PIN)
- Expected: HTTP 200
- Response contains:
  * profile.phone = original phone
  * profile.has_pincode: true
  * profile.signup_at: not null

STEP 8: Logout (best-effort)
- POST /v1/public/signup/logout
- Expected: HTTP 200 or 400 (optional, doesn't fail test)
```

**Expected Outcomes:**
- ✅ All steps return HTTP 200 (except logout which is optional)
- ✅ Each response matches expected schema
- ✅ Signup completes with PIN set
- ✅ Profile confirms signup

**Pass Criteria:**
```
// Step 1
expect(otpRequest.is_signup).toBe(false)
expect(otpRequest.next_state).toBe('signup.phone.verify')
expect(otpRequest.verification_info.ref_code).toBeDefined()

// Step 2
expect(otpVerify.is_signup).toBe(true)
expect(otpVerify.next_state).toBe('user.profile')

// Step 7
expect(profile.phone).toBe(originalPhone)
expect(profile.has_pincode).toBe(true)
expect(profile.signup_at).not.toBeNull()
```

**Failure Points:**
- ❌ OTP request returns 400 (invalid phone)
- ❌ OTP verify returns 400 (wrong code)
- ❌ Firebase sign-in fails
- ❌ PIN creation fails
- ❌ Profile doesn't show signup completion

**State Transitions:**
```
Request OTP → (is_signup: false) → 
Verify OTP → (is_signup: true) → 
Firebase Auth → 
Create PIN → 
Get Profile → (has_pincode: true) ✅
```

**Notes:**
- Most critical signup path
- Tests complete user onboarding
- Validates multi-service integration
- Phone must be unique across test runs

---

### TC-SIGN-002: LINE Signup - Complete Flow

**Test ID:** `TC-SIGN-002`
**Category:** Signup Workflows
**Priority:** 🔴 Critical
**Status:** ✅ Passing

**Objective:**
Verify complete LINE signup flow with phone verification.

**File Location:**
`api/tests/signup/signup-line.test.ts:35`

**Preconditions:**
- Valid LINE access token available
- Fresh phone number generated: `09{timestamp}{random}`
- Fresh email generated: `qa-signup-*@test.example.com`
- Fresh employee_id generated: `EMP{timestamp}{random}`
- Fixed LINE ID: from seed config
- Seeded employee created with LINE signup profile
- Test OTP: "123456"
- Test PIN: "999999"

**Test Steps:**

```
STEP 1: LINE Login - Get Auth Challenge
- POST /v1/public/signup/line
- Data:
  {
    channel_id: "{LINE_CHANNEL_ID}",
    access_token: "{LINE_ACCESS_TOKEN}",
    fcm_token: ""
  }
- Expected: HTTP 200
- Response contains:
  * is_signup: false
  * verification_info.auth_challenge

STEP 2: Request OTP for Phone
- POST /v1/public/signup/line/phone
- Params: ?verification_method=otp&action=request
- Data:
  {
    phone: "09XXXXXXXXX",
    auth_challenge: "{auth_challenge}"
  }
- Expected: HTTP 200
- Response contains:
  * verification.ref_code

STEP 3: Verify OTP
- POST /v1/public/signup/line/phone
- Params: ?verification_method=otp&action=verify
- Data:
  {
    phone: "09XXXXXXXXX",
    auth_challenge: "{auth_challenge}",
    fcm_token: "",
    authMethod: "line",
    verification: {
      ref_code: "{ref_code}",
      code: "123456"
    }
  }
- Expected: HTTP 200
- Response contains:
  * verification.token (Firebase custom token)

STEP 4: Firebase Sign In
- Call firebaseSignIn(customToken)
- Expected: HTTP 200
- Response contains refreshToken

STEP 5: Get Firebase ID Token (pre-PIN)
- Call firebaseRefreshToken(refreshToken)
- Expected: HTTP 200

STEP 6: Create PIN
- POST /v1/public/signup/create-pin
- Data: { pincode: "999999" }
- Expected: HTTP 200

STEP 7: Get Firebase ID Token (post-PIN)
- Call firebaseRefreshToken(refreshToken)
- Expected: HTTP 200

STEP 8: Get Profile
- GET /v1/public/signup/profile
- Expected: HTTP 200
- Response contains:
  * profile.line_id = fixed LINE ID
  * profile.has_pincode: true
  * profile.signup_at: not null

STEP 9: Cleanup - Clear line_id before delete
- PATCH /v1/admin/account/employee/{userId}
- Data: { information: { line_id: null } }
- Expected: HTTP 200 (best-effort)
```

**Expected Outcomes:**
- ✅ All steps return HTTP 200
- ✅ Signup completes with PIN
- ✅ Profile shows LINE ID
- ✅ Cleanup clears LINE ID constraint

**Pass Criteria:**
```
expect(lineSignup.is_signup).toBe(false)
expect(otpRequest.verification.ref_code).toBeDefined()
expect(profile.line_id).toBe(lineId)
expect(profile.has_pincode).toBe(true)
```

**Failure Points:**
- ❌ LINE auth returns 400 (invalid token)
- ❌ OTP request returns 400 (invalid phone)
- ❌ PIN creation fails
- ❌ Cleanup fails (line_id constraint issue)

**Critical Detail:**
LINE ID cleanup is essential for reusability:
```typescript
// Before deletion, must clear line_id to null
// Otherwise next test run fails with constraint violation
await updateEmployeeViaAPI(request, token, userId, {
  information: { line_id: null }
});
```

**Notes:**
- Second most critical signup path
- Tests LINE integration
- Requires LINE business account setup
- Must clear constraint before deletion

---

### TC-SIGN-003: Employee ID Signup - With National ID

**Test ID:** `TC-SIGN-003`
**Category:** Signup Workflows
**Priority:** 🟡 High
**Status:** ✅ Passing

**Objective:**
Verify employee ID signup flow using national ID for verification.

**File Location:**
`api/tests/signup/signup-employee-id.test.ts:152`

**Preconditions:**
- Employee created with national ID signup profile
- Fresh identifiers:
  - phone: `09{timestamp}{random}`
  - email: `qa-signup-*@test.example.com`
  - employee_id: `EMP{timestamp}{random}`
  - national_id: `{13-digit-random}`
- Company ID exists: 128
- Test OTP: "123456"
- Test PIN: "999999"

**Test Steps:**

```
STEP 1: Lookup Employee by ID and Identity
- POST /v1/public/signup/employee-id/lookup
- Data:
  {
    employee_id: "EMP123...",
    identity: "1234567890123", (national ID)
    company_id: 128
  }
- Expected: HTTP 200
- Response contains:
  * is_signup: false
  * verification_info.auth_challenge

STEP 2-8: Same as Phone Signup
- Request OTP
- Verify OTP
- Firebase sign in
- Get ID tokens
- Create PIN
- Get profile
- Logout

STEP 9: Verify Profile
- Profile should contain:
  * profile.employee_id = original employee_id
  * profile.has_pincode: true
  * profile.signup_at: not null
```

**Expected Outcomes:**
- ✅ Employee lookup succeeds
- ✅ All subsequent steps match phone signup
- ✅ Profile confirms employee signup completion

**Pass Criteria:**
```
expect(lookupResponse.is_signup).toBe(false)
expect(profile.employee_id).toBe(employeeId)
expect(profile.has_pincode).toBe(true)
```

**Failure Points:**
- ❌ Lookup returns 404 (employee not found)
- ❌ Identity validation fails
- ❌ OTP fails
- ❌ Profile doesn't reflect employee_id

**Differences from Phone Signup:**
| Aspect | Phone | Employee ID |
|--------|-------|------------|
| Identifier | Phone number | Employee ID + Identity |
| Identity | Not verified | National ID required |
| Lookup | Implicit in OTP | Explicit lookup call |
| Auth | Phone only | Employee + Identity |

**Notes:**
- Tests alternate signup path
- Verifies identity validation
- Uses national ID for additional security

---

### TC-SIGN-004: Employee ID Signup - With Passport

**Test ID:** `TC-SIGN-004`
**Category:** Signup Workflows
**Priority:** 🟡 High
**Status:** ✅ Passing

**Objective:**
Verify employee ID signup flow using passport number for verification.

**File Location:**
`api/tests/signup/signup-employee-id.test.ts:167`

**Preconditions:**
- Employee created with passport signup profile
- Fresh identifiers:
  - phone: `09{timestamp}{random}`
  - email: `qa-signup-*@test.example.com`
  - employee_id: `EMP{timestamp}{random}`
  - passport_no: `{2-letters}{6-digits}`
- Company ID exists: 128
- Test OTP: "123456"
- Test PIN: "999999"

**Test Steps:**

```
STEP 1: Lookup Employee by ID and Passport
- POST /v1/public/signup/employee-id/lookup
- Data:
  {
    employee_id: "EMP123...",
    identity: "AB123456", (passport number)
    company_id: 128
  }
- Expected: HTTP 200

STEP 2-9: Same as Employee ID (National ID) Signup
- All remaining steps identical
- Profile verification includes passport-based employee
```

**Expected Outcomes:**
- ✅ Employee lookup succeeds with passport
- ✅ Signup completes successfully
- ✅ Profile confirms employee signup

**Pass Criteria:**
```
expect(lookupResponse.is_signup).toBe(false)
expect(profile.employee_id).toBe(employeeId)
expect(profile.has_pincode).toBe(true)
```

**Failure Points:**
- ❌ Lookup fails with passport number
- ❌ Passport validation fails
- ❌ OTP verification fails

**Differences from National ID:**
| Aspect | National ID | Passport |
|--------|------------|----------|
| Identity field | 13-digit ID | 2-letter + 6-digit |
| Format validation | Numeric | Alphanumeric |
| Typical length | 13 chars | 8 chars |
| User type | Thai nationals | International |

**Notes:**
- Tests passport-based authentication
- Supports international employee signup
- Similar flow to national ID variant
- Different format validation

---

## Test Execution Summary

### Test Execution Order

Tests run in serial mode (not parallel) to prevent data conflicts:

```
1. TC-EMP-001: CREATE (4-6s)
2. TC-EMP-002: READ (4-5s)
3. TC-EMP-003: UPDATE (5-7s)
4. TC-EMP-004: DELETE (4-6s)
5. TC-EMP-005: BATCH (15-20s)
6. TC-SIGN-001: Phone Signup (9-12s)
7. TC-SIGN-002: LINE Signup (15-18s)
8. TC-SIGN-003: Employee ID (Nat'l ID) (10-14s)
9. TC-SIGN-004: Employee ID (Passport) (10-14s)
```

**Total Expected Time:** 40-50 seconds

---

## Coverage Analysis

### API Endpoint Coverage

| Endpoint | Test Cases | Status |
|----------|-----------|--------|
| POST /employee | TC-EMP-001, TC-EMP-005 | ✅ Full |
| PATCH /employee | TC-EMP-003, TC-EMP-005 | ✅ Full |
| DELETE /employee | TC-EMP-004, TC-EMP-005 | ✅ Full |
| POST /signup/phone/* | TC-SIGN-001 | ✅ Full |
| POST /signup/line/* | TC-SIGN-002 | ✅ Full |
| POST /signup/employee-id/* | TC-SIGN-003, TC-SIGN-004 | ✅ Full |

### Functionality Coverage

| Functionality | Test Cases | Status |
|--------------|-----------|--------|
| Authentication | All tests | ✅ Full |
| Create operations | TC-EMP-001, TC-EMP-005 | ✅ Full |
| Update operations | TC-EMP-003, TC-EMP-005 | ✅ Full |
| Delete operations | TC-EMP-004, TC-EMP-005 | ✅ Full |
| Data persistence | All tests | ✅ Full |
| OTP flow | TC-SIGN-001, 003, 004 | ✅ Full |
| Firebase integration | All signup | ✅ Full |
| PIN creation | All signup | ✅ Full |
| Schema validation | All tests | ✅ Full |
| Cleanup/Teardown | All tests | ✅ Full |

---

## Related Documents

- 📋 [TEST_REQUIREMENTS.md](./TEST_REQUIREMENTS.md) - Test objectives & pass criteria
- 🔌 [API_CONTRACT.md](./API_CONTRACT.md) - Endpoint specifications
- 📊 [TEST_DATA_REQUIREMENTS.md](./TEST_DATA_REQUIREMENTS.md) - Test data specs
- 🏗️ [INFRASTRUCTURE_REQUIREMENTS.md](./INFRASTRUCTURE_REQUIREMENTS.md) - Setup guide
