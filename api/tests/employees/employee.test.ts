import { test, expect } from '@playwright/test'
import { getAdminToken } from '../../helpers/admin-console-auth'
import {
  createEmployeeViaAPI,
  updateEmployeeViaAPI,
  deleteEmployeeViaAPI,
  buildEmployeePayload,
  buildUpdatePayload,
  EmployeeResponse,
  EmployeeInformation,
} from '../../../shared/employee-api'
import { getUserById, hardDeleteEmployee } from '../../../shared/db-helpers'
import { getCompany } from '../../../shared/utils/seed-config'

test.describe('Employee API', () => {
  test.describe.configure({ mode: 'serial' })

  const company = getCompany('phone')
  const userIdsToClean: number[] = []

  test.afterEach(async () => {
    await test.step('Cleanup — hard delete employee', async () => {
      while (userIdsToClean.length > 0) {
        const userId = userIdsToClean.pop()!
        await hardDeleteEmployee(String(userId))
      }
    })
  })

  test(
    'API – Employee – Create employee – Success',
    { tag: ['@component', '@high', '@smoke', '@regression', '@shared'] },
    async ({ request }) => {
      let token: string
      let userId: number
      let createdEmployee: EmployeeResponse
      let generatedPhone: string

      await test.step('Login as admin', async () => {
        token = await getAdminToken(request)
      })

      await test.step('Create employee with test data', async () => {
        const payload = buildEmployeePayload('Alice', {
          information: {
            first_name: 'Alice',
            last_name: 'Smith',
            company_id: String(company.id),
            paycycle_id: company.qa_paycycle_id,
          },
        })
        generatedPhone = payload.information.phone!
        createdEmployee = await createEmployeeViaAPI(request, token, payload)
        userId = createdEmployee.information.user_id
        userIdsToClean.push(userId)
      })

      await test.step('Verify API response contains required fields', async () => {
        expect(createdEmployee.information).toHaveProperty('user_id')
        expect(createdEmployee.information).toHaveProperty('first_name', 'Alice')
        expect(createdEmployee.information).toHaveProperty('last_name', 'Smith')
        expect(createdEmployee.information.phone).toBe(generatedPhone)
        expect(createdEmployee.information).toHaveProperty('employee_id')
      })

      await test.step('Verify database persists employee data', async () => {
        const dbUser = await getUserById(userId)
        expect(dbUser.first_name).toBe('Alice')
        expect(dbUser.last_name).toBe('Smith')
        expect(dbUser.status).toBe('active')
      })
    }
  )

  test(
    'API – Employee – Read employee data – Success',
    { tag: ['@component', '@high', '@regression', '@shared'] },
    async ({ request }) => {
      let token: string
      let userId: number
      let createdEmployee: EmployeeResponse
      let generatedPhone: string

      await test.step('Login as admin', async () => {
        token = await getAdminToken(request)
      })

      await test.step('Create employee with test data', async () => {
        const payload = buildEmployeePayload('Bob', {
          information: {
            first_name: 'Bob',
            last_name: 'Johnson',
            company_id: String(company.id),
            paycycle_id: company.qa_paycycle_id,
          },
        })
        generatedPhone = payload.information.phone!
        createdEmployee = await createEmployeeViaAPI(request, token, payload)
        userId = createdEmployee.information.user_id
        userIdsToClean.push(userId)
      })

      await test.step('Verify API response contains all required fields', async () => {
        const info = createdEmployee.information
        expect(info.user_id).toBe(userId)
        expect(info.first_name).toBe('Bob')
        expect(info.last_name).toBe('Johnson')
        expect(info.phone).toBe(generatedPhone)
        expect(info).toHaveProperty('email')
        expect(info).toHaveProperty('company_id')
        expect(info).toHaveProperty('employee_id')
        expect(info).toHaveProperty('paycycle_id')
        expect(info).toHaveProperty('status')
      })

      await test.step('Verify database reflects same data', async () => {
        const dbUser = await getUserById(userId)
        expect(dbUser.first_name).toBe('Bob')
        expect(dbUser.last_name).toBe('Johnson')
      })
    }
  )

  test(
    'API – Employee – Update employee first_name – Success',
    { tag: ['@component', '@high', '@regression', '@shared'] },
    async ({ request }) => {
      let token: string
      let userId: number
      let createdEmployee: EmployeeResponse
      let updatedEmployee: EmployeeResponse

      await test.step('Login as admin', async () => {
        token = await getAdminToken(request)
      })

      await test.step('Create employee with test data', async () => {
        const payload = buildEmployeePayload('Charlie', {
          information: {
            first_name: 'Charlie',
            last_name: 'Brown',
            company_id: String(company.id),
            paycycle_id: company.qa_paycycle_id,
          },
        })
        createdEmployee = await createEmployeeViaAPI(request, token, payload)
        userId = createdEmployee.information.user_id
        userIdsToClean.push(userId)
      })

      await test.step('Update employee first_name via PATCH', async () => {
        const updatePayload = buildUpdatePayload(createdEmployee.information, {
          first_name: 'Charles',
        })
        updatedEmployee = await updateEmployeeViaAPI(request, token, userId, updatePayload)
      })

      await test.step('Verify API response shows updated data', async () => {
        expect(updatedEmployee.information.first_name).toBe('Charles')
        expect(updatedEmployee.information.user_id).toBe(userId)
        expect(updatedEmployee.information.last_name).toBe('Brown')
      })

      await test.step('Verify database persisted update', async () => {
        const dbUser = await getUserById(userId)
        expect(dbUser.first_name).toBe('Charles')
        expect(dbUser.last_name).toBe('Brown')
      })
    }
  )

  test(
    'API – Employee – Delete employee – Success',
    { tag: ['@component', '@high', '@regression', '@shared'] },
    async ({ request }) => {
      let token: string
      let userId: number

      await test.step('Login as admin', async () => {
        token = await getAdminToken(request)
      })

      await test.step('Create employee with test data', async () => {
        const payload = buildEmployeePayload('Diana', {
          information: {
            first_name: 'Diana',
            last_name: 'Prince',
            company_id: String(company.id),
            paycycle_id: company.qa_paycycle_id,
          },
        })
        const created = await createEmployeeViaAPI(request, token, payload)
        userId = created.information.user_id
        userIdsToClean.push(userId)
      })

      await test.step('Verify employee exists in database', async () => {
        const dbUser = await getUserById(userId)
        expect(dbUser).toBeDefined()
        expect(dbUser.first_name).toBe('Diana')
      })

      // Tests the soft-delete API endpoint — intentionally uses deleteEmployeeViaAPI
      await test.step('Delete employee via API', async () => {
        await deleteEmployeeViaAPI(request, token, userId)
      })
    }
  )

  test(
    'API – Employee – Batch create and update employees – Success',
    { tag: ['@component', '@medium', '@regression', '@shared'] },
    async ({ request }) => {
      let token: string
      const names = ['Eve', 'Frank', 'Grace']
      const createdInfos: EmployeeInformation[] = []
      const batchUserIds: number[] = []

      await test.step('Login as admin', async () => {
        token = await getAdminToken(request)
      })

      await test.step('Create 3 employees in batch', async () => {
        for (const name of names) {
          const payload = buildEmployeePayload(name, {
            information: {
              first_name: name,
              last_name: 'TestBatch',
              company_id: String(company.id),
              paycycle_id: company.qa_paycycle_id,
            },
          })
          const created = await createEmployeeViaAPI(request, token, payload)
          batchUserIds.push(created.information.user_id)
          userIdsToClean.push(created.information.user_id)
          createdInfos.push(created.information)
        }
        expect(batchUserIds.length).toBe(3)
      })

      await test.step('Update all employees first_name field', async () => {
        for (let i = 0; i < batchUserIds.length; i++) {
          const updatePayload = buildUpdatePayload(createdInfos[i], {
            first_name: `${names[i]}_Updated`,
          })
          const updated = await updateEmployeeViaAPI(request, token, batchUserIds[i], updatePayload)
          expect(updated.information.first_name).toBe(`${names[i]}_Updated`)
        }
      })

      await test.step('Verify all updates persisted in database', async () => {
        for (let i = 0; i < batchUserIds.length; i++) {
          const dbUser = await getUserById(batchUserIds[i])
          expect(dbUser.first_name).toBe(`${names[i]}_Updated`)
        }
      })
    }
  )
})
