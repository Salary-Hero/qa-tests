# Test Requirements

## Overview

This document defines the comprehensive requirements for the QA API test suite, covering test strategy, objectives, scope, and success criteria.

## Test Strategy

### Approach
- **Framework:** Playwright Test (Node.js)
- **Environment:** Cloud-based API testing
- **Execution:** Automated via CI/CD pipeline
- **Scope:** REST API endpoints for Employee and Signup workflows

### Test Types

| Type | Coverage | Tools |
|------|----------|-------|
| **Unit Tests** | API request/response validation | Playwright + Zod schemas |
| **Integration Tests** | Multi-step workflows (signup, CRUD) | Playwright test.step() |
| **Database Tests** | Data persistence validation | PostgreSQL queries |
| **Schema Validation** | Request/response contract compliance | Zod schemas |

## Test Objectives

### Primary Goals

1. **Ensure API Reliability** - Validate all CRUD operations work correctly
2. **Verify Data Integrity** - Confirm data persists correctly in database
3. **Test Signup Workflows** - Validate complete signup flows for all auth methods
4. **Validate Contracts** - Ensure API responses match expected schemas
5. **Catch Regressions** - Detect breaking changes across releases

### Secondary Goals

1. Document API behavior for team reference
2. Provide executable specifications for endpoints
3. Enable safe refactoring of backend services
4. Support integration testing with downstream systems

## Test Scope

### In Scope ✅

- **Employee CRUD Operations**
  - Create employee via API
  - Read employee data
  - Update employee fields
  - Delete employee and cascading records
  - Batch create/update operations

- **Authentication & Signup**
  - Phone number signup flow
  - LINE integration signup flow
  - Employee ID (national ID) signup flow
  - Employee ID (passport) signup flow
  - OTP verification
  - PIN creation
  - Firebase integration

- **Data Validation**
  - API response schema compliance
  - Database persistence
  - Unique constraint enforcement
  - Required field validation

### Out of Scope ❌

- UI/Frontend testing
- Performance/load testing
- Security vulnerability testing
- Manual testing procedures
- Non-API workflows

## Pass/Fail Criteria

### Test Pass Requirements

✅ **All tests PASS when:**
1. API returns expected HTTP status code
2. Response body matches Zod schema validation
3. Response contains all required fields with correct types
4. Database reflects persisted changes
5. Cleanup executes successfully (no orphaned test data)

### Test Fail Criteria

❌ **Test FAILS if any condition is true:**
1. API status code is unexpected (e.g., 200 expected, got 400)
2. Response body doesn't match schema validation
3. Missing required fields in response
4. Database query returns no data (persistence failed)
5. Cleanup fails or leaves orphaned records
6. Assertions fail (expect statements don't match)

### Critical Path Tests

The following tests **MUST ALWAYS PASS**:
- ✅ Employee CREATE
- ✅ Employee READ
- ✅ Employee UPDATE
- ✅ Employee DELETE
- ✅ Phone signup (full flow)
- ✅ LINE signup (full flow)
- ✅ Employee ID signup (full flow)

## Current Test Status

### Test Results: 9/9 PASSING (100%) ✅

| Category | Count | Status |
|----------|-------|--------|
| Employee CRUD Tests | 5 | ✅ All Passing |
| Phone Signup | 1 | ✅ Passing |
| LINE Signup | 1 | ✅ Passing |
| Employee ID Signup (National ID) | 1 | ✅ Passing |
| Employee ID Signup (Passport) | 1 | ✅ Passing |
| **Total** | **9** | **✅ 100%** |

### Coverage by Operation

| Operation | Tests | Status |
|-----------|-------|--------|
| Create Employee | 2 | ✅ Passing |
| Read Employee | 1 | ✅ Passing |
| Update Employee | 2 | ✅ Passing |
| Delete Employee | 1 | ✅ Passing |
| Batch Operations | 1 | ✅ Passing |
| Signup Flows | 4 | ✅ Passing |

## Risk Assessment

### High Risk Areas

| Risk | Impact | Mitigation |
|------|--------|-----------|
| LINE signup unique constraint | 🔴 High | Clear line_id before deletion in cleanup |
| Firebase UID mismatch | 🔴 High | Use API endpoints only, no direct DB queries |
| Test data collisions | 🟡 Medium | Generate fresh identifiers each run |
| OTP/PIN failures | 🟡 Medium | Use fixed test credentials from .env |

### Low Risk Areas

- ✅ Basic CRUD operations (well-tested)
- ✅ Employee data validation (schema enforced)
- ✅ Database persistence (API handles cascading deletes)
- ✅ Authentication (uses secure token exchange)

## Success Metrics

### Quality Metrics

- **Test Pass Rate:** 100% (all 9 tests passing)
- **Test Stability:** Consistent pass rate across runs (no flakiness)
- **Coverage:** All critical CRUD operations tested
- **Response Time:** All tests complete in <50 seconds total

### Reliability Metrics

- **Data Cleanup:** 100% of test data properly deleted
- **No Orphaned Records:** Zero leftover employee records after test runs
- **Constraint Compliance:** All unique constraints respected
- **Database Sync:** All API changes reflected in database

## Test Execution

### Regular Testing
- **Frequency:** Every commit (CI/CD)
- **Environment:** DEV environment
- **Parallelization:** Serial execution for signup tests (must-be-serial)
- **Timeout:** 60 seconds per test, 3 minute suite total

### Manual Testing
- Run locally during development: `npm run test:api`
- Run with specific profile: `npm run test:api -- api/tests/employees/employee.spec.ts`
- Generate HTML report: `npm run report`

## Maintenance & Updates

### Review Cycle
- Review test results after each release
- Update test data if API contracts change
- Document any new endpoints or auth methods
- Refactor tests if they become flaky

### Change Management
- All test changes require code review
- Schema changes documented in API_CONTRACT.md
- Test data changes documented in TEST_DATA_REQUIREMENTS.md
- Infrastructure changes documented in INFRASTRUCTURE_REQUIREMENTS.md

## Related Documents

- 📋 [API_CONTRACT.md](./API_CONTRACT.md) - Detailed endpoint specifications
- 📊 [TEST_DATA_REQUIREMENTS.md](./TEST_DATA_REQUIREMENTS.md) - Test data specs
- 🏗️ [INFRASTRUCTURE_REQUIREMENTS.md](./INFRASTRUCTURE_REQUIREMENTS.md) - Setup & dependencies
- 🧪 [TEST_CASES.md](./TEST_CASES.md) - Detailed test cases
