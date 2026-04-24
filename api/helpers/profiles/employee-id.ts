import {
  buildMonthlyEmployeePayload,
  createEmployee,
  findEmployeeByIdentifier,
} from '../employee'
import {
  resolvePhone,
  generateEmployeeId,
  generateNationalId,
  generatePassportNo,
  generateEmail,
} from '../identifiers'
import { CleanupStep, Employee, SeedProfile } from '../seed'
import { getCompany } from '../../../shared/utils/seed-config'
import { hardDeleteEmployee } from '../../../shared/db-helpers'

const cleanupEmployee: CleanupStep = async (request, ctx) => {
  const userId = ctx.employee.user_id

  // Post-test phase: hard delete to remove phone/bank constraints for next run
  if (userId) {
    await hardDeleteEmployee(userId)
    return
  }

  // Pre-seed phase: find and hard delete any employee left from a failed run
  if (ctx.identifiers.employee_id) {
    try {
      const found = await findEmployeeByIdentifier(
        request,
        ctx.company,
        ctx.identifiers.employee_id,
        'employee_id'
      )
      if (found?.user_id) {
        await hardDeleteEmployee(found.user_id)
      }
    } catch {
      // pre-seed cleanup is best-effort — fresh identifiers prevent collisions
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
    phone: resolvePhone(),
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
    phone: resolvePhone(),
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
