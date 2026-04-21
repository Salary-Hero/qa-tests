# Employee CRUD — Test Requirements

## Objectives

1. Verify all CRUD operations succeed via admin API
2. Confirm data persists correctly in the `users` and `employment` tables
3. Validate API responses match expected schemas and field types
4. Ensure cascading deletes clean up all related records
5. Catch regressions when employee API changes

## Scope

### In Scope ✅
- `POST /v1/admin/account/employee/{companyId}` — create
- `PATCH /v1/admin/account/employee/{companyId}/{userId}` — update
- `DELETE /v1/admin/account/employee/{userId}` — delete (with cascade)
- API response field validation
- Database persistence checks (`users`, `employment` tables)
- Batch create/update operations

### Out of Scope ❌
- Dedicated GET endpoint (none exists — read validated from create response)
- UI/frontend flows
- Performance/load testing
- Bulk import via CSV

## Pass/Fail Criteria

A test **passes** when all of the following are true:
1. API returns the expected HTTP status code
2. Response body contains all required fields with correct types
3. Database query confirms the change persisted
4. Cleanup deletes the employee without error

A test **fails** if any of the following occur:
- Unexpected status code (e.g., 403 from sending read-only fields)
- Missing `user_id` in create response
- Database record not found after create/update
- Unique constraint violation from stale test data
- Cascading delete leaves orphaned records

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Sending read-only fields in PATCH | 🔴 403 error | `buildUpdatePayload()` whitelists 15 writable fields only |
| `paycycle_id` type mismatch | 🔴 400 error | API returns string, must send as number — converted explicitly |
| Stale phone/email from previous run | 🟡 409 collision | Generate fresh identifiers each run |
| Cascading delete fails silently | 🟡 Orphaned records | Post-delete DB query verifies cleanup |

## Execution

```bash
npm run test:api -- api/tests/employees/employee.spec.ts
```

Tests run serially (`test.describe.configure({ mode: 'serial' })`).
Expected total time: 30–40 seconds.
