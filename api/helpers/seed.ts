import { APIRequestContext } from '@playwright/test'
import { AuthMethod, Company } from '../../shared/utils/seed-config'

export type Identifiers = Partial<{
  phone: string
  line_id: string
  email: string
  employee_id: string
  national_id: string
  passport_no: string
}>

export type IdentifierStrategy = 'generated' | 'fixed' | 'pool'

export type Employee = {
  user_id: string
  identifiers: Identifiers
}

export type SeedContext = {
  company: Company
  employee: Employee
  identifiers: Identifiers
}

export type CleanupStep = (
  request: APIRequestContext,
  ctx: SeedContext
) => Promise<void>

export type SeedProfile = {
  name: string
  authMethod: AuthMethod
  identifierStrategy: IdentifierStrategy

  /** Resolves the identifier values to use for this run. */
  resolveIdentifiers: () => Identifiers

  /** Resolves the company to use for this run. */
  resolveCompany: () => Company

  /** Creates the employee record and returns the seeded Employee. */
  createEmployee: (
    request: APIRequestContext,
    company: Company,
    identifiers: Identifiers
  ) => Promise<Employee>

  /**
   * Ordered cleanup steps. Each step receives the full context and must
   * tolerate "not found" errors so that pre-seed forced cleanup is idempotent.
   */
  cleanupSteps: CleanupStep[]

  /** Parallelism hint for the test runner. */
  parallelism: 'safe' | 'must-be-serial'
}

/**
 * Runs all cleanup steps in order, best-effort.
 * Errors are caught and logged; never thrown.
 */
async function runCleanup(
  request: APIRequestContext,
  profile: SeedProfile,
  ctx: SeedContext,
  phase: 'pre-seed' | 'post-test'
): Promise<void> {
  for (const step of profile.cleanupSteps) {
    try {
      await step(request, ctx)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        `[seed:${profile.name}] ${phase} cleanup step failed (ignored):`,
        err instanceof Error ? err.message : err
      )
    }
  }
}

/**
 * Seeds data for a test using the given profile.
 *
 * Flow:
 *   1. Resolve identifiers + company from the profile
 *   2. Force-cleanup any leftover state (ignoring errors) — makes tests idempotent
 *   3. Create the employee via the profile's createEmployee()
 */
export async function seedFromProfile(
  request: APIRequestContext,
  profile: SeedProfile
): Promise<SeedContext> {
  const identifiers = profile.resolveIdentifiers()
  const company = profile.resolveCompany()

  // Pre-seed forced cleanup — build a partial context (no employee yet).
  // Cleanup steps must tolerate an empty user_id gracefully.
  const preCleanupCtx: SeedContext = {
    company,
    identifiers,
    employee: { user_id: '', identifiers },
  }
  await runCleanup(request, profile, preCleanupCtx, 'pre-seed')

  const employee = await profile.createEmployee(request, company, identifiers)

  return { company, employee, identifiers }
}

/**
 * Runs the cleanup steps from the profile, best-effort.
 * Safe to call in afterEach — never throws.
 */
export async function cleanupFromProfile(
  request: APIRequestContext,
  profile: SeedProfile,
  ctx: SeedContext
): Promise<void> {
  await runCleanup(request, profile, ctx, 'post-test')
}
