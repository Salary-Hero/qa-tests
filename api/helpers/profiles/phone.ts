import {
  buildMonthlyEmployeePayload,
  createEmployee,
  deleteEmployee,
  findEmployeeByIdentifier,
} from '../employee'
import { CleanupStep, Employee, SeedProfile } from '../seed'
import { getCompany } from '../../../shared/utils/seed-config'

function generatePhone(): string {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 100)}`.slice(-8)
  return `08${suffix}`
}

const cleanupEmployee: CleanupStep = async (request, ctx) => {
  let userId = ctx.employee.user_id

  // Pre-seed phase: user_id is empty — look up by phone identifier
  if (!userId && ctx.identifiers.phone) {
    const found = await findEmployeeByIdentifier(
      request,
      ctx.company,
      ctx.identifiers.phone,
      'phone'
    )
    userId = found?.user_id ?? ''
  }

  if (userId) {
    await deleteEmployee(request, userId)
  }
}

export const phoneSignupProfile: SeedProfile = {
  name: 'signup-phone',
  authMethod: 'phone',
  identifierStrategy: 'generated',
  parallelism: 'safe',

  resolveCompany: () => getCompany('phone'),

  resolveIdentifiers: () => ({
    phone: generatePhone(),
  }),

  createEmployee: async (request, company, identifiers): Promise<Employee> => {
    if (!identifiers.phone) {
      throw new Error('phoneSignupProfile: phone identifier is required')
    }

    const payload = buildMonthlyEmployeePayload({
      company,
      identifiers,
      nameSuffix: 'PhoneSignup',
    })

    const { user_id } = await createEmployee(request, company, payload)
    return { user_id, identifiers }
  },

  cleanupSteps: [cleanupEmployee],
}
