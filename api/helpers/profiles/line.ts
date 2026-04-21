import {
  buildMonthlyEmployeePayload,
  createEmployee,
  deleteEmployee,
  findEmployeeByIdentifier,
} from '../employee'
import { generatePhone, generateEmail, generateEmployeeId } from '../identifiers'
import { CleanupStep, Employee, SeedProfile } from '../seed'
import { getCompany, getFixedIdentifier } from '../../../shared/utils/seed-config'
import { getAdminToken } from '../admin-auth'
import { updateEmployeeViaAPI } from '../../../shared/employee-api'

const cleanupEmployee: CleanupStep = async (request, ctx) => {
  let userId = ctx.employee.user_id

  // Post-test phase: we have the user_id from the test we just ran
  // Must clear line_id first (unique constraint) before deletion
  if (userId) {
    try {
      const token = await getAdminToken(request)
      await updateEmployeeViaAPI(request, token, Number(userId), {
        information: { line_id: null },
      } as any)
    } catch {
      // If update fails, continue anyway - best-effort cleanup
    }
    await deleteEmployee(request, userId)
    return
  }

  // Pre-seed phase: user_id is empty — try to find and delete any lingering users
  // Uses fixed email since line_id and phone cannot be fixed
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
          const token = await getAdminToken(request)
          await updateEmployeeViaAPI(request, token, Number(found.user_id), {
            information: { line_id: null },
          } as any)
        } catch {
          // If update fails, continue anyway - best-effort cleanup
        }
        await deleteEmployee(request, found.user_id)
      }
    } catch {
      // If search or delete fails, that's OK - we'll create a fresh employee for this test
      // The API will handle cleanup properly at the end of this test
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
    phone: generatePhone(),
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
