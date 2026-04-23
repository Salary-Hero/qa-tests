/**
 * Test setup helper to reduce boilerplate in test files.
 *
 * Centralizes seed/cleanup logic that is duplicated across multiple test files.
 * Provides consistent beforeEach/afterEach behavior.
 */

import { test, APIRequestContext } from '@playwright/test'
import {
  seedFromProfile,
  cleanupFromProfile,
  SeedContext,
  SeedProfile,
} from './seed'

/**
 * Creates beforeEach/afterEach handlers for seed-based tests.
 *
 * Usage in test files:
 * ```
 * const { beforeEach, afterEach, getContext } = setupSeedTeardown(myProfile)
 * test.beforeEach(beforeEach)
 * test.afterEach(afterEach)
 *
 * test('my test', async () => {
 *   const ctx = getContext()
 *   // use ctx...
 * })
 * ```
 */
export function setupSeedTeardown(profile: SeedProfile) {
  let ctx: SeedContext

  return {
    beforeEach: async ({ request }: { request: APIRequestContext }) => {
      await test.step('Seed test data', async () => {
        ctx = await seedFromProfile(request, profile)
      })
    },

    afterEach: async ({ request }: { request: APIRequestContext }) => {
      await test.step('Cleanup test data', async () => {
        if (ctx) {
          await cleanupFromProfile(request, profile, ctx)
        }
      })
    },

    /**
     * Returns the current seed context.
     * Call this in test functions after setup completes.
     */
    getContext: (): SeedContext => ctx,
  }
}
