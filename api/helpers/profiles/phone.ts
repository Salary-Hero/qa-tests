import {
  buildMonthlyEmployeePayload,
  createEmployee,
  findEmployeeByIdentifier,
} from '../employee'
import { resolvePhone, generateEmail, generateEmployeeId } from '../identifiers'
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

  // Pre-seed phase: find and hard delete any employee left over from a failed run
  if (ctx.identifiers.phone) {
    try {
      const found = await findEmployeeByIdentifier(
        request,
        ctx.company,
        ctx.identifiers.phone,
        'phone'
      )
      if (found?.user_id) {
        await hardDeleteEmployee(found.user_id)
      }
    } catch {
      // If search or delete fails, the pool strategy ensures no collision on next run
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
    phone: resolvePhone(),
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
