import {
  buildMonthlyEmployeePayload,
  createEmployee,
  deleteEmployee,
  findEmployeeByIdentifier,
} from '../employee'
import { CleanupStep, Employee, SeedProfile } from '../seed'
import { getCompany } from '../../../shared/utils/seed-config'

function generateEmployeeId(): string {
  return `EMP${Date.now()}${Math.floor(Math.random() * 100)}`
}

function generateNationalId(): string {
  // 13 digits, first digit 1-8
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-12)
  return `1${suffix}`
}

function generatePassportNo(): string {
  // Format: 2 uppercase letters + 7 digits (common passport format)
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const l1 = letters[Math.floor(Math.random() * 26)]
  const l2 = letters[Math.floor(Math.random() * 26)]
  const digits = `${Date.now()}`.slice(-7)
  return `${l1}${l2}${digits}`
}

function generatePhone(): string {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 100)}`.slice(-8)
  return `08${suffix}`
}

const cleanupEmployee: CleanupStep = async (request, ctx) => {
  let userId = ctx.employee.user_id

  if (!userId && ctx.identifiers.employee_id) {
    const found = await findEmployeeByIdentifier(
      request,
      ctx.company,
      ctx.identifiers.employee_id,
      'employee_id'
    )
    userId = found?.user_id ?? ''
  }

  if (userId) {
    await deleteEmployee(request, userId)
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
