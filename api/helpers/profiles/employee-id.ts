import {
  buildMonthlyEmployeePayload,
  createEmployee,
  deleteEmployee,
  findEmployeeByIdentifier,
} from '../employee'
import {
  generatePhone,
  generateEmployeeId,
  generateNationalId,
  generatePassportNo,
  generateEmail,
} from '../identifiers'
import { CleanupStep, Employee, SeedProfile } from '../seed'
import { getCompany } from '../../../shared/utils/seed-config'

const cleanupEmployee: CleanupStep = async (request, ctx) => {
  let userId = ctx.employee.user_id

  // Post-test phase: we have the user_id from the test we just ran
  // Delete via API - backend cascades to all tables (employment, user_identity, user_balance, users)
  if (userId) {
    await deleteEmployee(request, userId)
    return
  }

  // Pre-seed phase: user_id is empty — try to find and delete any lingering users
  if (ctx.identifiers.employee_id) {
    try {
      const found = await findEmployeeByIdentifier(
        request,
        ctx.company,
        ctx.identifiers.employee_id,
        'employee_id'
      )
      if (found?.user_id) {
        await deleteEmployee(request, found.user_id)
      }
    } catch {
      // If search or delete fails, that's OK - fresh employee_id ensures no collision
      // Just continue seeding with the new employee_id
    }
  }
}

export const employeeIdSignupProfile: SeedProfile = {
  name: 'signup-employee-id',
  authMethod: 'employee_id',
  identifierStrategy: 'generated',
  parallelism: 'safe',

  resolveCompany: () => getCompany('employee_id'),

  resolveIdentifiers: () => ({
    employee_id: generateEmployeeId(),
    national_id: generateNationalId(),
    phone: generatePhone(),
    email: generateEmail(),
  }),

  createEmployee: async (request, company, identifiers): Promise<Employee> => {
    if (!identifiers.employee_id || !identifiers.national_id) {
      throw new Error(
        'employeeIdSignupProfile: employee_id and national_id are required'
      )
    }

    const payload = buildMonthlyEmployeePayload({
      company,
      identifiers,
      nameSuffix: 'EmpIdSignup',
    })

    const { user_id } = await createEmployee(request, company, payload)
    return { user_id, identifiers }
  },

  cleanupSteps: [cleanupEmployee],
}

export const employeeIdPassportSignupProfile: SeedProfile = {
  name: 'signup-employee-id-passport',
  authMethod: 'employee_id',
  identifierStrategy: 'generated',
  parallelism: 'safe',

  resolveCompany: () => getCompany('employee_id'),

  resolveIdentifiers: () => ({
    employee_id: generateEmployeeId(),
    passport_no: generatePassportNo(),
    phone: generatePhone(),
    email: generateEmail(),
  }),

  createEmployee: async (request, company, identifiers): Promise<Employee> => {
    if (!identifiers.employee_id || !identifiers.passport_no) {
      throw new Error(
        'employeeIdPassportSignupProfile: employee_id and passport_no are required'
      )
    }

    const payload = buildMonthlyEmployeePayload({
      company,
      identifiers,
      nameSuffix: 'EmpPassportSignup',
    })

    const { user_id } = await createEmployee(request, company, payload)
    return { user_id, identifiers }
  },

  cleanupSteps: [cleanupEmployee],
}
