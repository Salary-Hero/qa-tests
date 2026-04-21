# Test Data Setup & Usage Guide

## Quick Start

### 1. Environment Setup

```bash
cp .env.example .env
```

Update `.env` with your dev database credentials:
```env
DB_HOST=
DB_PORT=
DB_NAME=
DB_USER=
DB_PASSWORD=
```

### 2. Install Dependencies

```bash
yarn install
```

## Writing a Test

### Basic Pattern

```typescript
import { test, expect } from '@playwright/test';
import { useTestContext, useTestCleanup } from '../../shared/test-fixtures';
import { createFullEmployee } from '../../shared/test-data';
import { TEST_COMPANY_IDS } from '../../shared/constants';
import { getEmploymentById, getUserById } from '../../shared/test-helpers';

test('your test description', async ({ request }) => {
  // Step 1: Initialize test context
  const context = await useTestContext(TEST_COMPANY_IDS.defaultCompany);
  const cleanup = await useTestCleanup(context);

  try {
    // Step 2: Create test data
    const employee = await createFullEmployee(
      context,
      TEST_COMPANY_IDS.defaultCompany,
      {
        firstName: 'John',
        lastName: 'Doe',
      }
    );

    // Step 3: Call your API
    const response = await request.patch(
      `/api/employees/${employee.employment_id}`,
      { data: { firstName: 'Jane' } }
    );

    // Step 4: Verify response
    expect(response.status()).toBe(200);

    // Step 5: Verify database (optional but recommended)
    const updated = await getUserById(employee.user.legacy_user_id);
    expect(updated.first_name).toBe('Jane');

  } finally {
    // Cleanup runs automatically
    await cleanup();
  }
});
```

## Available Functions

### Setup Functions

#### `useTestContext(companyId: number)`
Initialize test context with a company ID.

```typescript
const context = await useTestContext(TEST_COMPANY_IDS.defaultCompany);
// context.companyId = 128
// context.testRunId = '<unique-uuid>'
// context.createdIds = Map<string, number[]>
// context.trackedForMetadata = Map<string, number[]>
```

#### `useTestCleanup(context: TestDataContext)`
Register cleanup to run after test. Returns cleanup function.

```typescript
const cleanup = await useTestCleanup(context);
// ... test code ...
await cleanup(); // Deletes all tracked records
```

### Data Creation

#### `createFullEmployee(context, companyId, options?)`
Create a complete employee with user and employment records.

```typescript
const employee = await createFullEmployee(
  context,
  TEST_COMPANY_IDS.defaultCompany,
  {
    firstName: 'John',     // optional
    lastName: 'Doe',       // optional
    email: 'john@example.com', // optional, defaults to qa-{uuid}@test.com
    employeeId: 'EMP-001', // optional
  }
);

// Returns:
// {
//   company: { company_id: 128, name: 'QA - Phone Signup Only' },
//   user: { user_uid, legacy_user_id, email, first_name, last_name },
//   employment: { employment_id, company_id, user_uid, employee_id },
// }
```

#### `createTestUser(context, options?)`
Create user records (legacy users + user_identity).

```typescript
const user = await createTestUser(context, {
  firstName: 'Jane',
  lastName: 'Smith',
  email: 'jane@example.com', // optional
});
```

#### `createTestEmployee(context, companyId, userUid, legacyUserId, options?)`
Create employment record (requires user to exist first).

```typescript
const employment = await createTestEmployee(
  context,
  128,
  user.user_uid,
  user.legacy_user_id,
  {
    employeeId: 'EMP-002',
    startDate: '2024-01-15',
    employeeType: 'PERMANENT',
  }
);
```

#### `createTestCompany(context, companyId)`
Fetch existing company (doesn't create).

```typescript
const company = await createTestCompany(context, TEST_COMPANY_IDS.defaultCompany);
// Returns: { company_id: 128, name: 'QA - Phone Signup Only' }
```

#### `createTestCompanyAndData(context, options?)`
Create a NEW company (for tests that need new company).

```typescript
const company = await createTestCompanyAndData(context, {
  name: 'New Test Company',
  email: 'test@company.com',
});
// Returns: { company_id: <new-id>, name: 'New Test Company' }
```

### Verification Functions

#### `getCompanyById(companyId)`
```typescript
const company = await getCompanyById(128);
// Returns: { company_id, name, email, status }
```

#### `getEmploymentById(employmentId)`
```typescript
const employment = await getEmploymentById(employee.employment_id);
// Returns: { employment_id, user_uid, company_id, employee_id, status, ... }
```

#### `getUserById(userId)`
```typescript
const user = await getUserById(employee.user.legacy_user_id);
// Returns: { user_id, email, first_name, last_name, status }
```

#### `getUserIdentityByUid(userUid)`
```typescript
const identity = await getUserIdentityByUid(employee.user.user_uid);
// Returns: { user_uid, legacy_user_id, personal_email, first_name, ... }
```

#### `verifyEmployeeData(employmentId, expectedData)`
```typescript
await verifyEmployeeData(employee.employment_id, {
  'first_name': 'John',
  'last_name': 'Doe',
  'status': 'active',
});
// Throws error if data doesn't match
```

## Cleanup Behavior

### What Gets Deleted
- ✅ Created `employment` records
- ✅ Created `users` records
- ✅ Created `user_identity` records

### What's Preserved
- ✅ `company` records (Company ID 128 and any other companies used)

### Metadata Tracking
All deleted records are logged to `test_metadata` table with:
- `test_run_id` - Unique test run identifier
- `table_name` - Which table the record came from
- `record_id` - The ID of the deleted record
- `created_at` - When it was logged

## Constants & Configuration

### Test Company IDs
```typescript
// From shared/constants.ts
export const TEST_COMPANY_IDS = {
  defaultCompany: 128, // "QA - Phone Signup Only"
};
```

### Test Defaults
```typescript
export const TEST_DEFAULTS = {
  FIRST_NAME: 'QA',
  LAST_NAME: 'Test User',
  PHONE_NUMBER: '+1234567890',
  COUNTRY_ID: 1,
  PHONE_CODE: '+1',
  EMPLOYEE_TYPE: 'PERMANENT',
  SALARY_TYPE: 'monthly',
  EMPLOYMENT_STATUS: 'active',
};
```

## Common Patterns

### Test with Multiple Employees
```typescript
test('bulk update employees', async ({ request }) => {
  const context = await useTestContext(TEST_COMPANY_IDS.defaultCompany);
  const cleanup = await useTestCleanup(context);

  try {
    // Create multiple employees
    const emp1 = await createFullEmployee(context, TEST_COMPANY_IDS.defaultCompany, {
      firstName: 'Alice',
    });
    const emp2 = await createFullEmployee(context, TEST_COMPANY_IDS.defaultCompany, {
      firstName: 'Bob',
    });

    // Test bulk update
    const response = await request.patch('/api/employees/bulk', {
      data: {
        ids: [emp1.employment_id, emp2.employment_id],
        updates: { status: 'inactive' },
      }
    });

    expect(response.status()).toBe(200);

  } finally {
    // Both employees will be cleaned up automatically
    await cleanup();
  }
});
```

### Test with New Company
```typescript
test('update company settings', async ({ request }) => {
  const context = await useTestContext(null); // No default company
  const cleanup = await useTestCleanup(context);

  try {
    // Create new company for this test
    const company = await createTestCompanyAndData(context, {
      name: 'New Company for Test',
    });

    // Create employee under new company
    const employee = await createFullEmployee(context, company.company_id, {
      firstName: 'John',
    });

    // Test company update
    const response = await request.patch(`/api/companies/${company.company_id}`, {
      data: { name: 'Updated Company Name' },
    });

    expect(response.status()).toBe(200);

  } finally {
    // Company AND employee will be deleted
    await cleanup();
  }
});
```

### Test with Pre-created User
```typescript
test('assign employee to department', async ({ request }) => {
  const context = await useTestContext(TEST_COMPANY_IDS.defaultCompany);
  const cleanup = await useTestCleanup(context);

  try {
    // Create user separately
    const user = await createTestUser(context, {
      firstName: 'Jane',
      lastName: 'Doe',
    });

    // Create employment with specific options
    const employment = await createTestEmployee(
      context,
      TEST_COMPANY_IDS.defaultCompany,
      user.user_uid,
      user.legacy_user_id,
      {
        employeeId: 'EMP-12345',
        startDate: '2024-01-01',
      }
    );

    // Test department assignment
    const response = await request.patch(
      `/api/employees/${employment.employment_id}/department`,
      { data: { departmentId: 5 } }
    );

    expect(response.status()).toBe(200);

  } finally {
    await cleanup();
  }
});
```

## Troubleshooting

### Database Connection Error
- Check `.env` file has correct DB credentials
- Verify PostgreSQL is running
- Test connection: `psql -h localhost -U postgres -d showhire_dev`

### Email Validation Fails
- Emails are automatically generated as `qa-{uuid}@test.com`
- This format passes the regex validation
- Custom emails must match: `^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$`

### Cleanup Fails
- Check test_metadata table exists: `SELECT * FROM test_metadata;`
- Check for foreign key constraints blocking deletion
- Review error logs for specific table issues

### Test Data Not Cleaned Up
- Check `test_metadata` table for stuck records
- Manual cleanup: `DELETE FROM test_metadata WHERE created_at < NOW() - INTERVAL '24 hours';`
- Verify the finally block is being called

## See Also

- `api/tests/employees/update-employee.spec.ts` - Complete example test
- `shared/test-data.ts` - Implementation details
- `shared/test-helpers.ts` - All available verification functions
- `README.md` - General test documentation
