# Employee CRUD — Test Cases

Test file: `api/tests/employees/employee.test.ts`
Run: `yarn test:api --grep "Employee CRUD"`

---

## TC-EMP-001 · Create Employee

**Priority:** Critical | **Status:** ✅ PASS | **Line:** `:27`

**Preconditions:** Admin token obtained. Fresh phone, email, employee_id generated.

**Steps:**
1. Login as admin
2. Build payload with `first_name: "Alice"`, `last_name: "Smith"`, generated identifiers
3. `POST /v1/admin/account/employee/128`
4. Verify response: `user_id` exists, fields match payload
5. Verify DB: `SELECT * FROM users WHERE user_id = ?` → `status = "active"`
6. Cleanup: `DELETE /v1/admin/account/employee/{userId}`

**Pass when:**
```
status = 201
response.information.user_id defined
response.information.first_name = "Alice"
response.information.last_name = "Smith"
response.information.phone = generatedPhone
dbUser.status = "active"
```

**Fails if:** 409 (duplicate identifiers) · 403 (bad payload) · `user_id` missing · DB record absent

---

## TC-EMP-002 · Read Employee Data

**Priority:** Critical | **Status:** ✅ PASS | **Line:** `:71`

**Preconditions:** Admin token obtained. Employee created in setup step.

**Steps:**
1. Login as admin
2. Create employee: `first_name: "Bob"`, `last_name: "Johnson"`
3. Verify create response contains all required fields
4. Verify DB record matches

**Pass when:**
```
response.information.user_id defined
response.information.first_name = "Bob"
response.information.last_name = "Johnson"
response.information has: email, company_id, employee_id, paycycle_id, status
dbUser.first_name = "Bob"
```

**Fails if:** Any required field missing from response · DB record absent

---

## TC-EMP-003 · Update Employee

**Priority:** Critical | **Status:** ✅ PASS | **Line:** `:119`

**Preconditions:** Admin token obtained. Employee created in setup step.

**Steps:**
1. Login as admin
2. Create employee: `first_name: "Charlie"`, `last_name: "Brown"`
3. Build update payload via `buildUpdatePayload()` — whitelisted fields only, `paycycle_id` converted to number
4. `PATCH /v1/admin/account/employee/128/{userId}` with `first_name: "Charles"`
5. Verify response shows updated value, unchanged fields retained
6. Verify DB reflects update
7. Cleanup

**Pass when:**
```
status = 200
response.information.first_name = "Charles"
response.information.last_name = "Brown"    ← unchanged
response.information.user_id = original userId
dbUser.first_name = "Charles"
```

**Fails if:** 403 (read-only field sent) · Updated value incorrect · DB not updated

**Critical detail:** Must NOT include `user_id`, `created_at`, `updated_at` in PATCH body → causes 403.

---

## TC-EMP-004 · Delete Employee

**Priority:** Critical | **Status:** ✅ PASS | **Line:** `:166`

**Preconditions:** Admin token obtained. Employee created in setup step.

**Steps:**
1. Login as admin
2. Create employee: `first_name: "Diana"`, `last_name: "Prince"`
3. Verify employee exists in DB
4. `DELETE /v1/admin/account/employee/{userId}`
5. Verify response success

**Pass when:**
```
status = 200
dbUser exists before delete
DELETE response is successful
```

**Fails if:** 404 (not found) · 403 (permission denied) · DB record persists after delete

---

## TC-EMP-005 · Batch Create and Update

**Priority:** High | **Status:** ✅ PASS | **Line:** `:197`

**Preconditions:** Admin token obtained. Sufficient unique identifiers available.

**Steps:**
1. Login as admin
2. Create 3 employees in loop: `Eve`, `Frank`, `Grace` — each with unique phone/email/employee_id
3. Verify 3 `user_id`s returned
4. Update all 3 in loop: append `_Updated` to each `first_name`
5. Verify each PATCH response shows updated `first_name`
6. Verify all 3 DB records updated
7. Cleanup: delete all 3

**Pass when:**
```
userIds.length = 3
For each employee:
  PATCH status = 200
  response.information.first_name = "{name}_Updated"
  dbUser.first_name = "{name}_Updated"
```

**Fails if:** Any create/update fails · Unique constraint violation · Any DB record missing · Cleanup incomplete

---

## Negative Test Cases (Planned)

These cases are **not yet implemented**. They are documented here so the AI has full context when asked to implement them. Add them to `api/tests/employees/employee.test.ts` in a separate `describe('Employee CRUD — negative cases')` block.

All negative tests still require:
- All four mandatory tags: `@component`, `@high/@medium`, `@regression`, `@shared`
- Full `test.step()` wrapping
- `afterEach` cleanup if an employee was created

---

### TC-EMP-NEG-001 · Create Employee — Duplicate Phone

**Priority:** High | **Status:** 🔲 PLANNED

**Scenario:** Attempt to create two employees with the same phone number. The second create should be rejected.

**Setup:** Create employee A with `resolvePhone()`. Capture `user_id` of A.

**Steps:**
1. Create employee A — expect 201
2. Attempt to create employee B with the same phone as A
3. Assert response is 409 (or whatever error code the API returns for duplicate)
4. Verify employee B does not exist in DB

**Teardown:** `hardDeleteEmployee(userIdA)`

**Pass when:**
```
First create: status = 201
Second create: status = 409
DB: only one user with that phone exists
```

---

### TC-EMP-NEG-002 · Create Employee — Missing Required Fields

**Priority:** High | **Status:** 🔲 PLANNED

**Scenario:** Attempt to create an employee omitting a required field (`phone`, `employee_id`, `paycycle_id`). The API must reject with a 4xx error.

**Setup:** No employee needed — this is a pure request validation test.

**Steps:**
1. Send `POST /v1/admin/account/employee/{companyId}` with `phone` omitted
2. Assert 400 (or 422 — check actual API contract)
3. Repeat with `employee_id` omitted
4. Repeat with `paycycle_id` omitted

**Pass when:**
```
Each request: status = 4xx
Response body contains a meaningful error message
No employee created in DB
```

---

### TC-EMP-NEG-003 · Update Employee — Read-Only Field Rejected

**Priority:** High | **Status:** 🔲 PLANNED

**Scenario:** Send a PATCH that includes `user_id` in the body. The API should reject it with 403.

**Setup:** Create a fresh employee.

**Steps:**
1. Create employee — capture `user_id`
2. Build PATCH payload that includes `user_id: userId`
3. `PATCH /v1/admin/account/employee/{companyId}/{userId}`
4. Assert response is 403

**Teardown:** `hardDeleteEmployee(userId)`

**Pass when:**
```
status = 403
Employee data unchanged in DB
```

**Note:** Verify this against the actual API contract — also test `created_at` and `updated_at` as read-only fields if the contract specifies them.

---

### TC-EMP-NEG-004 · Update Employee — Wrong paycycle_id Type

**Priority:** Medium | **Status:** 🔲 PLANNED

**Scenario:** Send `paycycle_id` as a string (e.g. `"3661"`) instead of a number. Verify the API rejects or handles it consistently.

**Setup:** Create a fresh employee.

**Steps:**
1. Create employee — capture `user_id`
2. Build PATCH payload with `paycycle_id: "3661"` (string, not number)
3. Send PATCH
4. Assert response — document actual behaviour (reject 4xx, or accept and coerce)

**Teardown:** `hardDeleteEmployee(userId)`

**Note:** This test documents API behaviour — the expected status depends on what the API actually does. The goal is to catch regressions if the API's type handling changes.

---

### TC-EMP-NEG-005 · Delete Employee — Non-Existent user_id

**Priority:** Medium | **Status:** 🔲 PLANNED

**Scenario:** Attempt to delete a `user_id` that does not exist. The API must return 404 (not 500).

**Setup:** No employee needed.

**Steps:**
1. Call `DELETE /v1/admin/account/employee/999999999` (guaranteed non-existent ID)
2. Assert response is 404

**Pass when:**
```
status = 404
Response body contains an error message (not a 500 stack trace)
```
