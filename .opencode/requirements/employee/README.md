# Feature: Employee CRUD

Full lifecycle management of employee records via admin API.

## Scope

Create, read, update, and delete employee records including batch operations. Verifies both API responses and database persistence.

## Test Files

- `api/tests/employees/employee.spec.ts`
- `api/helpers/profiles/` (seed profiles used by signup tests)

## Documents

| File | Purpose |
|------|---------|
| [test-requirements.md](./test-requirements.md) | Objectives, scope, pass/fail criteria, risks |
| [api-contract.md](./api-contract.md) | POST / PATCH / DELETE endpoint specs |
| [test-data.md](./test-data.md) | Field specs, generators, unique constraints |
| [test-cases.md](./test-cases.md) | TC-EMP-001 through TC-EMP-005 |

## Quick Reference

| Test ID | Operation | Status |
|---------|-----------|--------|
| TC-EMP-001 | Create employee | ✅ PASS |
| TC-EMP-002 | Read employee data | ✅ PASS |
| TC-EMP-003 | Update employee field | ✅ PASS |
| TC-EMP-004 | Delete employee | ✅ PASS |
| TC-EMP-005 | Batch create + update | ✅ PASS |

## Auth

Admin Bearer token. See [shared/authentication.md](../shared/authentication.md).
