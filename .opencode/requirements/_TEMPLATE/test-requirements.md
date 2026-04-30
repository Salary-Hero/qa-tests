# <Feature Name> — Test Requirements

## Objectives

1. <!-- What must be verified? -->
2. <!-- e.g. Verify API response fields and types -->
3. <!-- e.g. Confirm data persists in the database -->
4. <!-- e.g. Validate error handling for invalid inputs -->

## Scope

### In Scope ✅
- <!-- List endpoints and operations covered -->

### Out of Scope ❌
- UI/frontend flows
- Performance/load testing
- <!-- Other exclusions -->

## Pass/Fail Criteria

A test **passes** when all of the following are true:
1. API returns the expected HTTP status code
2. Response body contains all required fields with correct types
3. <!-- Any DB verification criteria -->
4. Cleanup completes without error

A test **fails** if any of the following occur:
- Unexpected status code
- Missing or incorrect field in response
- <!-- Other failure conditions -->

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| <!-- Describe risk --> | 🔴/🟡/🟢 <!-- impact --> | <!-- How to mitigate --> |

## Execution

```bash
yarn test:api -- api/tests/<feature-name>/<feature-name>.test.ts
```
