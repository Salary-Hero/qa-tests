# Test Coverage Matrix

Last updated: 2026-04-30 | Passing: **17/18 (94%)** | Planned: **1** | Planned negative cases: **2/14**

## Test Cases

| Test ID | Feature | Test Name | File | Tags | Priority | Smoke | Status |
|---|---|---|---|---|---|---|---|
| TC-EMP-001 | Employee CRUD | Create employee | `employees/employee.test.ts` | `@smoke @shared` | High | ✅ | ✅ PASS |
| TC-EMP-002 | Employee CRUD | Read employee data | `employees/employee.test.ts` | `@shared` | High | | ✅ PASS |
| TC-EMP-003 | Employee CRUD | Update employee first_name | `employees/employee.test.ts` | `@shared` | High | | ✅ PASS |
| TC-EMP-004 | Employee CRUD | Delete employee | `employees/employee.test.ts` | `@shared` | High | | ✅ PASS |
| TC-EMP-005 | Employee CRUD | Batch create and update | `employees/employee.test.ts` | `@medium @shared` | Medium | | ✅ PASS |
| TC-SIGN-001 | Signup: Phone | Full signup flow | `signup/signup-phone.test.ts` | `@smoke @guardian` | High | ✅ | ✅ PASS |
| TC-SIGN-002 | Signup: LINE | Full signup flow | `signup/signup-line.test.ts` | `@guardian` | High | | ✅ PASS |
| TC-SIGN-003 | Signup: Employee ID | Full flow with national ID | `signup/signup-employee-id.test.ts` | `@guardian` | High | | ✅ PASS |
| TC-SIGN-004 | Signup: Employee ID | Full flow with passport | `signup/signup-employee-id.test.ts` | `@guardian` | High | | ✅ PASS |
| TC-CONSENT-001 | Digital Consent | Import → consent_status = new | `digital-consent/digital-consent.test.ts` | `@smoke @guardian` | High | ✅ | ✅ PASS |
| TC-CONSENT-002 | Digital Consent | Signup with national_id | `digital-consent/digital-consent.test.ts` | `@guardian` | High | | ✅ PASS |
| TC-CONSENT-003 | Digital Consent | Signup with passport_no | `digital-consent/digital-consent.test.ts` | `@guardian` | High | | ✅ PASS |
| TC-CONSENT-004 | Digital Consent | Non-signed-up stay consent_status = new | `digital-consent/digital-consent.test.ts` | `@guardian` | High | | ✅ PASS |
| TC-CONSENT-EID-001 | Digital Consent: Employee ID Only | Import → consent_status = new | `digital-consent/digital-consent.test.ts` | `@smoke @guardian` | High | ✅ | ✅ PASS |
| TC-CONSENT-EID-002 | Digital Consent: Employee ID Only | Signup with national_id | `digital-consent/digital-consent.test.ts` | `@guardian` | High | | ✅ PASS |
| TC-CONSENT-EID-003 | Digital Consent: Employee ID Only | Signup with passport_no | `digital-consent/digital-consent.test.ts` | `@guardian` | High | | ✅ PASS |
| TC-CONSENT-EID-004 | Digital Consent: Employee ID Only | Non-signed-up stay consent_status = new | `digital-consent/digital-consent.test.ts` | `@guardian` | High | | ✅ PASS |
| TC-CONSENT-EID-005 | Digital Consent: Employee ID Only | Full approve flow — consent_status = approved, status = active | `digital-consent/digital-consent.test.ts` | `@guardian` | High | | 🔲 PLANNED |

## Summary by Feature

| Feature | Tests | Passing | Squad | Notes |
|---|---|---|---|---|
| Employee CRUD | 5 | ✅ 5 | `@shared` | Create, read, update, delete, batch |
| Signup: Phone | 1 | ✅ 1 | `@guardian` | OTP → Firebase → PIN → profile |
| Signup: LINE | 1 | ✅ 1 | `@guardian` | LINE token → OTP → Firebase → PIN → profile |
| Signup: Employee ID | 2 | ✅ 2 | `@guardian` | national_id and passport_no variants |
| Digital Consent | 4 | ✅ 4 | `@guardian` | Company imports employee_id + national_id/passport_no |
| Digital Consent: Employee ID Only | 5 | ✅ 4 / 🔲 1 | `@guardian` | Screening import + signup (national_id, passport_no) + approval |
| **Total** | **18** | **✅ 17 / 🔲 1** | | |

## Summary by Operation

| Operation | Tests | Status |
|---|---|---|
| Employee Create | TC-EMP-001, TC-EMP-002, TC-EMP-003, TC-EMP-004, TC-EMP-005 | ✅ |
| Employee Update | TC-EMP-003, TC-EMP-005 | ✅ |
| Employee Delete | TC-EMP-004, TC-EMP-005 | ✅ |
| Phone OTP signup | TC-SIGN-001 | ✅ |
| LINE signup | TC-SIGN-002 | ✅ |
| Employee ID signup | TC-SIGN-003, TC-SIGN-004 | ✅ |
| PIN creation | TC-SIGN-001, TC-SIGN-002, TC-SIGN-003, TC-SIGN-004, TC-CONSENT-002, TC-CONSENT-003, TC-CONSENT-EID-002, TC-CONSENT-EID-003 | ✅ |
| Profile verification | TC-SIGN-001, TC-SIGN-002, TC-SIGN-003, TC-SIGN-004, TC-CONSENT-002, TC-CONSENT-003, TC-CONSENT-EID-002, TC-CONSENT-EID-003 | ✅ |
| Consent import (employee_id + identity) | TC-CONSENT-001 | ✅ |
| Consent import (employee_id only) | TC-CONSENT-EID-001 | ✅ |
| Consent signup (identity pre-loaded) | TC-CONSENT-002, TC-CONSENT-003 | ✅ |
| Consent signup (identity user-provided) | TC-CONSENT-EID-002, TC-CONSENT-EID-003 | ✅ |
| DB state check | TC-CONSENT-001, TC-CONSENT-004, TC-CONSENT-EID-001, TC-CONSENT-EID-004 | ✅ |

## Smoke Tests (`@smoke`)

Fast CI gate — run these first to catch critical failures early.

```bash
yarn test:api --grep @smoke
yarn test:api:staging --grep @smoke
```

| Test ID | Feature | Test Name |
|---|---|---|
| TC-EMP-001 | Employee CRUD | Create employee |
| TC-SIGN-001 | Signup: Phone | Full signup flow |
| TC-CONSENT-001 | Digital Consent | Import → consent_status = new |
| TC-CONSENT-EID-001 | Digital Consent: Employee ID Only | Import → consent_status = new |

## Planned: Negative Test Cases

These cases are designed and documented but not yet implemented. See individual `test-cases.md` files for full step-by-step details.

| Test ID | Feature | Scenario | Priority | Status |
|---|---|---|---|---|
| TC-EMP-NEG-001 | Employee CRUD | Create employee — duplicate phone number | High | 🔲 PLANNED |
| TC-EMP-NEG-002 | Employee CRUD | Create employee — missing required fields | High | 🔲 PLANNED |
| TC-EMP-NEG-003 | Employee CRUD | Update employee — read-only field rejected (user_id in PATCH) | High | 🔲 PLANNED |
| TC-EMP-NEG-004 | Employee CRUD | Update employee — invalid paycycle_id type (string instead of number) | Medium | 🔲 PLANNED |
| TC-EMP-NEG-005 | Employee CRUD | Delete employee — non-existent user_id | Medium | 🔲 PLANNED |
| TC-SIGN-NEG-001 | Signup: Phone | OTP verify — wrong OTP code | High | 🔲 PLANNED |
| TC-SIGN-NEG-002 | Signup: Phone | OTP verify — expired OTP | High | 🔲 PLANNED |
| TC-SIGN-NEG-003 | Signup: Phone | OTP request — phone not registered as employee | High | 🔲 PLANNED |
| TC-SIGN-NEG-004 | Signup: Phone | OTP request — already signed-up phone | Medium | 🔲 PLANNED |
| TC-SIGN-NEG-005 | Signup: Phone | OTP request — invalid phone format | Medium | 🔲 PLANNED |
| TC-SIGN-NEG-006 | Signup: Phone | Create PIN — wrong OTP token (invalid Firebase token) | High | 🔲 PLANNED |
| TC-SIGN-NEG-007 | Signup: Phone | Full flow — duplicate signup attempt (phone already active) | High | 🔲 PLANNED |
| TC-CONSENT-EID-NEG-001 | Digital Consent: Employee ID Only | Approval import — identity mismatch (wrong national_id) rejected | High | 🔲 PLANNED |
| TC-CONSENT-EID-NEG-002 | Digital Consent: Employee ID Only | Approval import — duplicate bank account number rejected | High | 🔲 PLANNED |

**Implementation note:** When implementing negative cases, add them to the existing test file for that feature. Each negative test still requires all four mandatory tags and full `test.step()` wrapping. Negative cases do not need a seed employee unless the scenario requires a registered phone/identity to exist first.
