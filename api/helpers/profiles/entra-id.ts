import { findEmployeeByIdentifier } from '../employee'
import { CleanupStep, SeedProfile } from '../seed'
import {
  getCompany,
  getFixedIdentifier,
} from '../../../shared/utils/seed-config'
import { hardDeleteEmployee } from '../../../shared/db-helpers'

/**
 * TODO: Implement Microsoft Entra ID signup profile.
 *
 * Notes for implementer:
 * - Identifier field on employee record: `email`
 * - `email` is a fixed identifier per environment (only one reserved account).
 * - Tests using this profile MUST be serial within the file.
 * - Populate seed-config.json → fixedIdentifiers.email + companies.entra_id per env.
 * - Signup flow will need an Entra ID token — obtaining it may require extra setup.
 */
const cleanupEmployee: CleanupStep = async (request, ctx) => {
  let userId = ctx.employee.user_id

  if (!userId && ctx.identifiers.email) {
    const found = await findEmployeeByIdentifier(
      request,
      ctx.company,
      ctx.identifiers.email,
      'email'
    )
    userId = found?.user_id ?? ''
  }

  if (userId) {
    await hardDeleteEmployee(userId)
  }
}

export const entraIdSignupProfile: SeedProfile = {
  name: 'signup-entra-id',
  authMethod: 'entra_id',
  identifierStrategy: 'fixed',
  parallelism: 'must-be-serial',

  resolveCompany: () => getCompany('entra_id'),

  resolveIdentifiers: () => ({
    email: getFixedIdentifier('email'),
  }),

  createEmployee: async () => {
    throw new Error(
      'entraIdSignupProfile.createEmployee is not implemented yet. ' +
        'Fill in seed-config.json (companies.entra_id + fixedIdentifiers.email) ' +
        'and implement the payload using buildMonthlyEmployeePayload.'
    )
  },

  cleanupSteps: [cleanupEmployee],
}
