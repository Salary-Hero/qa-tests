import { deleteEmployee, findEmployeeByIdentifier } from '../employee'
import { CleanupStep, SeedProfile } from '../seed'
import {
  getCompany,
  getFixedIdentifier,
} from '../../../shared/utils/seed-config'

/**
 * TODO: Implement LINE signup profile.
 *
 * Notes for implementer:
 * - Bruno reference: .../🟢 [E2E] Signup/🟠 By Line/
 * - `line_id` is a fixed identifier per environment (only one reserved ID).
 * - Tests using this profile MUST be serial within the file.
 * - Populate seed-config.json → fixedIdentifiers.line_id + companies.line per env.
 */
const cleanupEmployee: CleanupStep = async (request, ctx) => {
  let userId = ctx.employee.user_id

  if (!userId && ctx.identifiers.line_id) {
    const found = await findEmployeeByIdentifier(
      request,
      ctx.company,
      ctx.identifiers.line_id,
      'line_id'
    )
    userId = found?.user_id ?? ''
  }

  if (userId) {
    await deleteEmployee(request, userId)
  }
}

export const lineSignupProfile: SeedProfile = {
  name: 'signup-line',
  authMethod: 'line',
  identifierStrategy: 'fixed',
  parallelism: 'must-be-serial',

  resolveCompany: () => getCompany('line'),

  resolveIdentifiers: () => ({
    line_id: getFixedIdentifier('line_id'),
  }),

  createEmployee: async () => {
    throw new Error(
      'lineSignupProfile.createEmployee is not implemented yet. ' +
        'Fill in seed-config.json (companies.line + fixedIdentifiers.line_id) ' +
        'and implement the payload using buildMonthlyEmployeePayload.'
    )
  },

  cleanupSteps: [cleanupEmployee],
}
