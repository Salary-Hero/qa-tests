import {
  buildMonthlyEmployeePayload,
  createEmployee,
  findEmployeeByIdentifier,
} from '../employee'
import { resolvePhone, generateEmail, generateEmployeeId } from '../identifiers'
import { CleanupStep, Employee, SeedProfile } from '../seed'
import { getCompany, getFixedIdentifier } from '../../../shared/utils/seed-config'
import { getAdminToken } from '../admin-auth'
import { updateEmployeeViaAPI, EmployeePatchPayload } from '../../../shared/employee-api'
import { hardDeleteEmployee } from '../../../shared/db-helpers'

const clearLineId = async (request: Parameters<CleanupStep>[0], userId: string) => {
  const numericUserId = Number(userId)
  if (!numericUserId || isNaN(numericUserId)) {
    throw new Error(`clearLineId: invalid user_id "${userId}"`)
  }
  const token = await getAdminToken(request)
  // LINE imposes a unique constraint on line_id — must be cleared before hard delete
  const payload: EmployeePatchPayload = { information: { first_name: '', line_id: null } }
  await updateEmployeeViaAPI(request, token, numericUserId, payload)
}

const cleanupEmployee: CleanupStep = async (request, ctx) => {
  const userId = ctx.employee.user_id

  // Post-test phase: clear line_id unique constraint then hard delete
  if (userId) {
    try {
      await clearLineId(request, userId)
    } catch {
      // If clearing line_id fails, hard delete proceeds — FK cascade removes it
    }
    await hardDeleteEmployee(userId)
    return
  }

  // Pre-seed phase: find any employee left from a failed run and hard delete it
  if (ctx.identifiers.email) {
    try {
      const found = await findEmployeeByIdentifier(
        request,
        ctx.company,
        ctx.identifiers.email,
        'email'
      )
      if (found?.user_id) {
        try {
          await clearLineId(request, found.user_id)
        } catch {
          // proceed to hard delete regardless
        }
        await hardDeleteEmployee(found.user_id)
      }
    } catch {
      // pre-seed cleanup is best-effort — fresh identifiers prevent collisions
    }
  }
}

export const lineSignupProfile: SeedProfile = {
  name: 'signup-line',
  authMethod: 'line',
  identifierStrategy: 'fixed',
  parallelism: 'must-be-serial',

  resolveCompany: () => getCompany('line'),

  // Generate unique email and employee_id per run
  // line_id is fixed for LINE integration, phone is generated per run
  resolveIdentifiers: () => ({
    line_id: getFixedIdentifier('line_id'),
    email: generateEmail(),
    phone: resolvePhone(),
    employee_id: generateEmployeeId(),
  }),

  createEmployee: async (request, company, identifiers): Promise<Employee> => {
    if (!identifiers.line_id) {
      throw new Error('lineSignupProfile: line_id is required')
    }

    const payload = buildMonthlyEmployeePayload({
      company,
      identifiers,
      nameSuffix: 'LineSignup',
    })

    const { user_id } = await createEmployee(request, company, payload)
    return { user_id, identifiers }
  },

  cleanupSteps: [cleanupEmployee],
}
