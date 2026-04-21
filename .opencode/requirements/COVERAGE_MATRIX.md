# Test Coverage Matrix

Last updated: 2026-04-21 | Total: **9/9 passing (100%)**

## Test Cases

| Test ID | Feature | Test File | Endpoints | Auth | DB Tables | Priority | Status |
|---------|---------|-----------|-----------|------|-----------|----------|--------|
| TC-EMP-001 | Employee CRUD | `employees/employee.spec.ts:27` | `POST /employee/{companyId}` | Bearer | users, employment | Critical | ✅ PASS |
| TC-EMP-002 | Employee CRUD | `employees/employee.spec.ts:71` | `POST /employee/{companyId}` | Bearer | users | Critical | ✅ PASS |
| TC-EMP-003 | Employee CRUD | `employees/employee.spec.ts:119` | `POST + PATCH /employee/{companyId}/{userId}` | Bearer | users | Critical | ✅ PASS |
| TC-EMP-004 | Employee CRUD | `employees/employee.spec.ts:166` | `POST + DELETE /employee/{userId}` | Bearer | users, employment, user_identity, user_balance | Critical | ✅ PASS |
| TC-EMP-005 | Employee CRUD | `employees/employee.spec.ts:197` | `POST ×3 + PATCH ×3 + DELETE ×3` | Bearer | users, employment | High | ✅ PASS |
| TC-SIGN-001 | Signup: Phone | `signup/signup-phone.test.ts:32` | `POST /signup/phone/otp/request+verify` | OTP → Firebase | users, user_identity | Critical | ✅ PASS |
| TC-SIGN-002 | Signup: LINE | `signup/signup-line.test.ts:35` | `POST /signup/line + /signup/line/phone` | LINE → OTP → Firebase | users, user_identity | Critical | ✅ PASS |
| TC-SIGN-003 | Signup: Employee ID | `signup/signup-employee-id.test.ts:152` | `POST /signup/employee-id/lookup+phone` | OTP → Firebase | users, user_identity | High | ✅ PASS |
| TC-SIGN-004 | Signup: Employee ID | `signup/signup-employee-id.test.ts:167` | `POST /signup/employee-id/lookup+phone` | OTP → Firebase | users, user_identity | High | ✅ PASS |

## Summary by Feature

| Feature | Tests | Passing | Priority |
|---------|-------|---------|----------|
| Employee CRUD | 5 | ✅ 5 | Critical + High |
| Signup: Phone | 1 | ✅ 1 | Critical |
| Signup: LINE | 1 | ✅ 1 | Critical |
| Signup: Employee ID | 2 | ✅ 2 | High |
| **Total** | **9** | **✅ 9** | |

## Summary by Operation

| Operation | Tests | Status |
|-----------|-------|--------|
| Create (POST) | TC-EMP-001, TC-EMP-002, TC-EMP-003, TC-EMP-004, TC-EMP-005 | ✅ |
| Update (PATCH) | TC-EMP-003, TC-EMP-005 | ✅ |
| Delete (DELETE) | TC-EMP-004, TC-EMP-005 | ✅ |
| OTP signup | TC-SIGN-001, TC-SIGN-003, TC-SIGN-004 | ✅ |
| LINE signup | TC-SIGN-002 | ✅ |
| PIN creation | TC-SIGN-001, TC-SIGN-002, TC-SIGN-003, TC-SIGN-004 | ✅ |
| Profile verification | TC-SIGN-001, TC-SIGN-002, TC-SIGN-003, TC-SIGN-004 | ✅ |
