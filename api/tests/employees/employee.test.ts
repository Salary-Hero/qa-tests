/**
 * Employee API — CRUD test suite.
 * Cleanup uses hardDeleteEmployee() to fully remove phone and bank_account_no
 * from the paycycle uniqueness constraint between runs.
 * All employees are created and deleted within each test — no shared state.
 */

import { test, expect } from '@playwright/test';
import { getAdminToken } from '../../helpers/admin-auth';
import {
  createEmployeeViaAPI,
  updateEmployeeViaAPI,
  deleteEmployeeViaAPI,
  buildEmployeePayload,
  buildUpdatePayload,
  EmployeeResponse,
  EmployeeInformation,
} from '../../../shared/employee-api';
import { getUserById, hardDeleteEmployee } from '../../../shared/db-helpers';
import { getCompany } from '../../../shared/utils/seed-config';

test.describe('Employee API - CRUD Operations', () => {
  test.describe.configure({ mode: 'serial' });

  const company = getCompany('phone');

  test('CREATE - Create new employee via API', async ({ request }) => {
    let token: string;
    let userId: number;

    await test.step('Login as admin', async () => {
      token = await getAdminToken(request);
    });

    let createdEmployee: EmployeeResponse;
    let generatedPhone: string;
    await test.step('Create employee with test data', async () => {
      const createPayload = buildEmployeePayload('Alice', {
        information: {
          first_name: 'Alice',
          last_name: 'Smith',
          company_id: String(company.id),
          paycycle_id: company.qa_paycycle_id,
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
      await test.step('Cleanup - Hard delete employee', async () => {
        await hardDeleteEmployee(String(userId));
      });
    }
  });

  test('READ - Retrieve complete employee data via API', async ({ request }) => {
    let token: string;
    let userId: number;

    await test.step('Login as admin', async () => {
      token = await getAdminToken(request);
    });

    let createdEmployee: EmployeeResponse;
    let generatedPhone: string;
    await test.step('Create employee with test data', async () => {
      const createPayload = buildEmployeePayload('Bob', {
        information: {
          first_name: 'Bob',
          last_name: 'Johnson',
          company_id: String(company.id),
          paycycle_id: company.qa_paycycle_id,
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
      await test.step('Cleanup - Hard delete employee', async () => {
        await hardDeleteEmployee(String(userId));
      });
    }
  });

  test('UPDATE - Modify employee first_name via PATCH API', async ({ request }) => {
    let token: string;
    let userId: number;

    await test.step('Login as admin', async () => {
      token = await getAdminToken(request);
    });

    let createdEmployee: EmployeeResponse;
    await test.step('Create employee with test data', async () => {
      const createPayload = buildEmployeePayload('Charlie', {
        information: {
          first_name: 'Charlie',
          last_name: 'Brown',
          company_id: String(company.id),
          paycycle_id: company.qa_paycycle_id,
        },
      });
      createdEmployee = await createEmployeeViaAPI(request, token, createPayload);
      userId = createdEmployee.information.user_id;
    });

    try {
      let updatedEmployee: EmployeeResponse;
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
      await test.step('Cleanup - Hard delete employee', async () => {
        await hardDeleteEmployee(String(userId));
      });
    }
  });

  test('DELETE - Remove employee via API', async ({ request }) => {
    let token: string;
    let userId: number;

    await test.step('Login as admin', async () => {
      token = await getAdminToken(request);
    });

    await test.step('Create employee with test data', async () => {
      const createPayload = buildEmployeePayload('Diana', {
        information: {
          first_name: 'Diana',
          last_name: 'Prince',
          company_id: String(company.id),
          paycycle_id: company.qa_paycycle_id,
        },
      });
      const createdEmployee = await createEmployeeViaAPI(request, token, createPayload);
      userId = createdEmployee.information.user_id;
    });

    await test.step('Verify employee exists in database', async () => {
      const dbUser = await getUserById(userId);
      expect(dbUser).toBeDefined();
      expect(dbUser.first_name).toBe('Diana');
    });

    // Tests the soft-delete API endpoint — intentionally uses deleteEmployeeViaAPI
    await test.step('Delete employee via API', async () => {
      await deleteEmployeeViaAPI(request, token, userId);
    });

    // Hard delete after the API soft-delete test to clear paycycle constraints
    await test.step('Cleanup - Hard delete employee', async () => {
      await hardDeleteEmployee(String(userId));
    });
  });

  test('BATCH - Create multiple employees and update all via API', async ({ request }) => {
    let token: string;
    const userIds: number[] = [];

    await test.step('Login as admin', async () => {
      token = await getAdminToken(request);
    });

    const names = ['Eve', 'Frank', 'Grace'];
    const createdInfos: EmployeeInformation[] = [];

    try {
      await test.step('Create 3 employees in batch', async () => {
        for (const name of names) {
          const createPayload = buildEmployeePayload(name, {
            information: {
              first_name: name,
              last_name: 'TestBatch',
              company_id: String(company.id),
              paycycle_id: company.qa_paycycle_id,
            },
          });

          const created = await createEmployeeViaAPI(request, token, createPayload);
          userIds.push(created.information.user_id);
          createdInfos.push(created.information);
        }

        expect(userIds.length).toBe(3);
      });

      await test.step('Update all employees first_name field', async () => {
        for (let i = 0; i < userIds.length; i++) {
          const userId = userIds[i];
          const originalInfo = createdInfos[i];

          const updatePayload = buildUpdatePayload(originalInfo, {
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
      await test.step('Cleanup - Hard delete all employees', async () => {
        for (const userId of userIds) {
          await hardDeleteEmployee(String(userId));
        }
      });
    }
  });
});
