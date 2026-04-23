# Employee CRUD — Test Cases

Test file: `api/tests/employees/employee.spec.ts`
Run: `npm run test:api -- api/tests/employees/employee.spec.ts`

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
