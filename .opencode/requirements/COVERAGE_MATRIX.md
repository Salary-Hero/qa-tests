# Test Coverage Matrix

Last updated: 2026-04-23 | Total: **13/13 passing (100%)**

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
| TC-CONSENT-001 | Digital Consent | `digital-consent/digital-consent.test.ts` | `POST/PUT /screening-import/*` (7 steps) | Bearer | employee_profile | Critical | ✅ PASS |
| TC-CONSENT-002 | Digital Consent | `digital-consent/digital-consent.test.ts` | `/consent/screening/validate`, `/request-form/request+verify`, Firebase, `/pincode/create`, `/profile` | Bearer + OTP → Firebase | employee_profile, users | Critical | ✅ PASS |
| TC-CONSENT-003 | Digital Consent | `digital-consent/digital-consent.test.ts` | Same as TC-CONSENT-002 | Bearer + OTP → Firebase | employee_profile, users | High | ✅ PASS |
| TC-CONSENT-004 | Digital Consent | `digital-consent/digital-consent.test.ts` | None (DB check only) | — | employee_profile | High | ✅ PASS |

## Summary by Feature

| Feature | Tests | Passing | Priority |
|---------|-------|---------|----------|
| Employee CRUD | 5 | ✅ 5 | Critical + High |
| Signup: Phone | 1 | ✅ 1 | Critical |
| Signup: LINE | 1 | ✅ 1 | Critical |
| Signup: Employee ID | 2 | ✅ 2 | High |
| Digital Consent | 4 | ✅ 4 | Critical + High |
| **Total** | **13** | **✅ 13** | |

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
| Consent import | TC-CONSENT-001 | 🔲 |
| Consent signup | TC-CONSENT-002, TC-CONSENT-003 | 🔲 |
| DB state check | TC-CONSENT-001, TC-CONSENT-004 | 🔲 |
