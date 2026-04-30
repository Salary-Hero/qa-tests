# <Feature Name> — Test Cases

Test file: `api/tests/<feature-name>/<feature-name>.test.ts`
Run: `yarn test:api --grep "<Feature Name>"`

---

## TC-XXX-001 · <Test Name>

**Priority:** Critical / High / Medium / Low | **Status:** 🔲 PLANNED
**Tags:** `@component` `@high` `@smoke` `@guardian`

**Preconditions:** <!-- What must exist before this test runs -->

**Steps:**
1. <!-- Step 1 -->
2. <!-- Step 2 -->
3. <!-- Assert response -->
4. <!-- Assert DB state if applicable -->
5. Cleanup

**Pass when:**
```
status = 201
response.<field> = <expected value>
```

**Fails if:** <!-- Common failure modes, e.g. 409 duplicate, 403 bad payload -->

**Teardown:** <!-- e.g. hardDeleteEmployee(userId) -->

---

## Negative Test Cases (Planned)

These cases are not yet implemented.

| Test ID | Scenario | Priority | Status |
|---------|----------|----------|--------|
| TC-XXX-NEG-001 | <!-- Scenario description --> | High | 🔲 PLANNED |
