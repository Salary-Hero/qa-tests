/**
 * Test template — copy this file to api/tests/<feature>/<feature>.test.ts to start a new test.
 *
 * Steps:
 *   1. Copy this file to the right location (e.g. api/tests/signup/signup-phone.test.ts)
 *   2. Replace every TODO comment with real values
 *   3. Run: yarn tsc       — must pass with zero errors
 *   4. Run: yarn test:api  — verify the test runs and passes
 *
 * Full guide: docs/API_TESTING_GUIDE.md
 * Quick start: docs/API_TESTING_GUIDE.md#0-quick-start
 */

import { test, expect } from '@playwright/test'
import { setupSeedTeardown } from '../helpers/test-setup'

// TODO: Import the seed profile for your auth method.
// Available profiles:
//   phoneSignupProfile    → api/helpers/profiles/phone.ts
//   lineSignupProfile     → api/helpers/profiles/line.ts
//   employeeIdSignupProfile → api/helpers/profiles/employee-id.ts
//
// Example:
//   import { phoneSignupProfile } from '../helpers/profiles/phone'
import { phoneSignupProfile } from '../helpers/profiles/phone'

// TODO: Import the API helper functions you need.
// All helpers live in api/helpers/. Common ones:
//   requestPhoneOtp, verifyPhoneOtp  → phone-signup-api.ts
//   firebaseSignIn, firebaseRefreshToken → firebase.ts
//   createPin                         → pin-api.ts
//   getProfile                        → profile-api.ts
//   logout                            → auth-api.ts
//
// Example:
//   import { requestPhoneOtp, verifyPhoneOtp } from '../helpers/phone-signup-api'

// TODO: Import the Zod schema for your API response.
// Schemas live in api/schema/. Create a new one if needed.
// Example:
//   import { MyFeatureSchema } from '../schema/my-feature.schema'

// TODO: Replace 'Feature Name' with a short name for what you are testing.
// This label appears in the HTML report.
test.describe('TODO: Feature Name', () => {
  // Wire up automatic seed (beforeEach) and cleanup (afterEach).
  // TODO: Replace phoneSignupProfile with the profile for your auth method.
  const { beforeEach, afterEach, getContext } = setupSeedTeardown(phoneSignupProfile)
  test.beforeEach(beforeEach)
  test.afterEach(afterEach)

  // TODO: Replace the test name with the correct format:
  //   'API – <Feature> – <Scenario> – <Expected Result>'
  //
  // TODO: Replace the tags. All four tag groups are required:
  //   @component (single endpoint) or @workflow (multi-step flow)
  //   @high / @medium / @low
  //   @smoke (fast CI gate) and/or @regression (full suite)
  //   @guardian / @avengers / @shared
  test(
    'API – TODO Feature – TODO Scenario – TODO Expected Result',
    { tag: ['@component', '@high', '@regression', '@shared'] },
    async ({ request }) => {
      // Access the seeded employee's data.
      // ctx.identifiers holds: phone, email, employee_id (and others depending on profile)
      // ctx.company holds: id, name, qa_paycycle_id
      const ctx = getContext()

      // TODO: Declare variables for values you need to pass between steps.
      // Example:
      //   let refCode: string
      //   let idToken: string

      // TODO: Add test steps. Every action must be inside test.step().
      // Step name should describe the action (e.g. 'Request OTP', 'Verify response').
      await test.step('TODO: Step name', async () => {
        // TODO: Call your API helper here.
        // Use parseResponse() — never call response.json() manually.
        // Example:
        //   const refCode = await requestPhoneOtp(request, ctx.identifiers.phone!)
        //   expect(refCode).toBeTruthy()
      })

      await test.step('TODO: Step name', async () => {
        // TODO: Add more steps as needed.
        // Each step should do one thing and assert its result.
      })

      // TODO: Add your final assertion step.
      await test.step('Verify result', async () => {
        // TODO: Assert the expected outcome.
        // Example:
        //   const body = await getProfile(request, idToken)
        //   expect(body.profile.phone).toBe(ctx.identifiers.phone)
        //   expect(body.profile.has_pincode).toBe(true)
      })
    }
  )
})
