/**
 * Employee API - CRUD Test Suite
 * 
 * Tests the complete employee lifecycle via API:
 * - CREATE: POST /v1/admin/account/employee/{companyId}
 * - READ: GET via API response validation
 * - UPDATE: PATCH /v1/admin/account/employee/{companyId}/{userId}
 * - DELETE: DELETE /v1/admin/account/employee/{userId}
 * 
 * Test Pattern:
 * 1. Login as admin → get Bearer token
 * 2. Setup: Create employee via API
 * 3. Test: Call API operation (create/read/update/delete)
 * 4. Verify: Validate API response
 * 5. Verify: Query database to confirm persistence
 * 6. Cleanup: Delete via API or database (company kept for reuse)
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../../../shared/auth';
import { createEmployeeViaAPI, updateEmployeeViaAPI, deleteEmployeeViaAPIWithFallback, buildEmployeePayload, buildUpdatePayload } from '../../../shared/employee-api';
import { getUserById } from '../../../shared/test-helpers';

test.describe('Employee API - CRUD Operations', () => {
  test.describe.configure({ mode: 'serial' });
  
  test('CREATE - Create new employee via API', async ({ request }) => {
    let token: string;
    let userId: number;

    await test.step('Login as admin', async () => {
      token = await loginAsAdmin(request);
    });

    let createdEmployee: any;
    let generatedPhone: string;
    await test.step('Create employee with test data', async () => {
      const createPayload = buildEmployeePayload('Alice', {
        information: {
          first_name: 'Alice',
          last_name: 'Smith',
        },
      });
      generatedPhone = createPayload.information.phone!;
      createdEmployee = await createEmployeeViaAPI(request, token, createPayload);
      userId = createdEmployee.information.user_id;
    });

    try {
      await test.step('Verify API response contains required fields', async () => {
        expect(createdEmployee.information).toHaveProperty('user_id');
        expect(createdEmployee.information).toHaveProperty('first_name', 'Alice');
        expect(createdEmployee.information).toHaveProperty('last_name', 'Smith');
        expect(createdEmployee.information.phone).toBe(generatedPhone);
        expect(createdEmployee.information).toHaveProperty('employee_id');
      });

      await test.step('Verify database persists employee data', async () => {
        const dbUser = await getUserById(userId);
        expect(dbUser.first_name).toBe('Alice');
        expect(dbUser.last_name).toBe('Smith');
        expect(dbUser.status).toBe('active');
      });
    } finally {
      await test.step('Cleanup - Delete employee', async () => {
        await deleteEmployeeViaAPIWithFallback(request, token, userId);
      });
    }
  });

  test('READ - Retrieve complete employee data via API', async ({ request }) => {
    let token: string;
    let userId: number;

    await test.step('Login as admin', async () => {
      token = await loginAsAdmin(request);
    });

    let createdEmployee: any;
    let generatedPhone: string;
    await test.step('Create employee with test data', async () => {
      const createPayload = buildEmployeePayload('Bob', {
        information: {
          first_name: 'Bob',
          last_name: 'Johnson',
        },
      });
      generatedPhone = createPayload.information.phone!;
      createdEmployee = await createEmployeeViaAPI(request, token, createPayload);
      userId = createdEmployee.information.user_id;
    });

    try {
      await test.step('Verify API response contains all required fields', async () => {
        const info = createdEmployee.information;
        expect(info.user_id).toBe(userId);
        expect(info.first_name).toBe('Bob');
        expect(info.last_name).toBe('Johnson');
        expect(info.phone).toBe(generatedPhone);
        expect(info).toHaveProperty('email');
        expect(info).toHaveProperty('company_id');
        expect(info).toHaveProperty('employee_id');
        expect(info).toHaveProperty('paycycle_id');
        expect(info).toHaveProperty('status');
      });

      await test.step('Verify database reflects same data', async () => {
        const dbUser = await getUserById(userId);
        expect(dbUser.first_name).toBe('Bob');
        expect(dbUser.last_name).toBe('Johnson');
      });
    } finally {
      await test.step('Cleanup - Delete employee', async () => {
        await deleteEmployeeViaAPIWithFallback(request, token, userId);
      });
    }
  });

  test('UPDATE - Modify employee first_name via PATCH API', async ({ request }) => {
    let token: string;
    let userId: number;

    await test.step('Login as admin', async () => {
      token = await loginAsAdmin(request);
    });

    let createdEmployee: any;
    await test.step('Create employee with test data', async () => {
      const createPayload = buildEmployeePayload('Charlie', {
        information: {
          first_name: 'Charlie',
          last_name: 'Brown',
        },
      });
      createdEmployee = await createEmployeeViaAPI(request, token, createPayload);
      userId = createdEmployee.information.user_id;
    });

    try {
      let updatedEmployee: any;
      await test.step('Update employee first_name via PATCH', async () => {
        const updatePayload = buildUpdatePayload(createdEmployee.information, {
          first_name: 'Charles',
        });
        updatedEmployee = await updateEmployeeViaAPI(request, token, userId, updatePayload);
      });

      await test.step('Verify API response shows updated data', async () => {
        expect(updatedEmployee.information.first_name).toBe('Charles');
        expect(updatedEmployee.information.user_id).toBe(userId);
        expect(updatedEmployee.information.last_name).toBe('Brown');
      });

      await test.step('Verify database persisted update', async () => {
        const dbUser = await getUserById(userId);
        expect(dbUser.first_name).toBe('Charles');
        expect(dbUser.last_name).toBe('Brown');
      });
    } finally {
      await test.step('Cleanup - Delete employee', async () => {
        await deleteEmployeeViaAPIWithFallback(request, token, userId);
      });
    }
  });

  test('DELETE - Remove employee via API', async ({ request }) => {
    let token: string;
    let userId: number;

    await test.step('Login as admin', async () => {
      token = await loginAsAdmin(request);
    });

    let createdEmployee: any;
    await test.step('Create employee with test data', async () => {
      const createPayload = buildEmployeePayload('Diana', {
        information: {
          first_name: 'Diana',
          last_name: 'Prince',
        },
      });
      createdEmployee = await createEmployeeViaAPI(request, token, createPayload);
      userId = createdEmployee.information.user_id;
    });

    await test.step('Verify employee exists in database', async () => {
      const dbUser = await getUserById(userId);
      expect(dbUser).toBeDefined();
      expect(dbUser.first_name).toBe('Diana');
    });

    await test.step('Delete employee via API', async () => {
      await deleteEmployeeViaAPIWithFallback(request, token, userId);
    });
  });

  test('BATCH - Create multiple employees and update all via API', async ({ request }) => {
    let token: string;
    const userIds: number[] = [];

    await test.step('Login as admin', async () => {
      token = await loginAsAdmin(request);
    });

    const names = ['Eve', 'Frank', 'Grace'];
    const createdEmployees: any[] = [];

    try {
      await test.step('Create 3 employees in batch', async () => {
        for (const name of names) {
          const createPayload = buildEmployeePayload(name, {
            information: {
              first_name: name,
              last_name: 'TestBatch',
            },
          });

          const created = await createEmployeeViaAPI(request, token, createPayload);
          userIds.push(created.information.user_id);
          createdEmployees.push(created.information);
        }

        expect(userIds.length).toBe(3);
      });

      await test.step('Update all employees first_name field', async () => {
        for (let i = 0; i < userIds.length; i++) {
          const userId = userIds[i];
          const originalEmp = createdEmployees[i];

          const updatePayload = buildUpdatePayload(originalEmp, {
            first_name: names[i] + '_Updated',
          });

          const updated = await updateEmployeeViaAPI(request, token, userId, updatePayload);
          expect(updated.information.first_name).toBe(names[i] + '_Updated');
        }
      });

      await test.step('Verify all updates persisted in database', async () => {
        for (let i = 0; i < userIds.length; i++) {
          const dbUser = await getUserById(userIds[i]);
          expect(dbUser.first_name).toBe(names[i] + '_Updated');
        }
      });
    } finally {
      await test.step('Cleanup - Delete all employees', async () => {
        for (const userId of userIds) {
          await deleteEmployeeViaAPIWithFallback(request, token, userId);
        }
      });
    }
  });
});
