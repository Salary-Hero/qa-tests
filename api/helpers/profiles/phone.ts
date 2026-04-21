import {
  buildMonthlyEmployeePayload,
  createEmployee,
  deleteEmployee,
  findEmployeeByIdentifier,
} from '../employee'
import { generatePhone, generateEmail, generateEmployeeId } from '../identifiers'
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
  // This helps maintain idempotency if a previous test run failed to cleanup
  if (ctx.identifiers.phone) {
    try {
      const found = await findEmployeeByIdentifier(
        request,
        ctx.company,
        ctx.identifiers.phone,
        'phone'
      )
      if (found?.user_id) {
        await deleteEmployee(request, found.user_id)
      }
    } catch {
      // If search or delete fails, that's OK - fresh phone number ensures no collision
      // Just continue seeding with the new phone
    }
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
    email: generateEmail(),
    employee_id: generateEmployeeId(),
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
