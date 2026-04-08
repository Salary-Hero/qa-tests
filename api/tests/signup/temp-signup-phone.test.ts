import { test, expect } from '@playwright/test'
import user from '../../../shared/fixtures/user.json'
import { OTP, APP_VERSION } from '../../../shared/utils/env'
import {
  createEmployee,
  deleteEmployee,
  cleanupSignup,
  Employee,
} from '../../helpers/employee'
import { validateSchema } from '../../../shared/utils/schema'
import {
  OtpRequestSchema,
  OtpVerifySchema,
  SignupSchema,
  PinSetupSchema,
} from '../../schema/signup.schema'

test.describe('Signup by Phone', () => {
  let employee: Employee

  test.beforeEach(async ({ request }) => {
    await test.step('Seed: create employee', async () => {
      employee = await createEmployee(request, user.employee)
    })
  })

  test.afterEach(async ({ request }) => {
    await test.step('Cleanup: remove signup record', async () => {
      await cleanupSignup(request, employee.phone)
    })
    await test.step('Cleanup: delete employee', async () => {
      await deleteEmployee(request, employee.id)
    })
  })

  test('should complete signup successfully with a valid phone number', async ({
    request,
  }) => {
    let refCode: string

    await test.step('Request OTP', async () => {
      const response = await request.post(
        '/api/v2/public/account/authen/signup/phone',
        {
          data: { phone: user.phone },
          headers: { 'x-app-version': APP_VERSION },
        }
      )

      expect(response.status()).toBe(200)
      const body = await response.json()
      validateSchema(body, OtpRequestSchema, 'OTP request')
      refCode = body.verification_info.ref_code
    })

    await test.step('Verify OTP', async () => {
      const response = await request.post(
        '/api/v2/public/account/authen/signup/verify-otp',
        {
          data: { phone: user.phone, ref_code: refCode, code: OTP },
          headers: { 'x-app-version': APP_VERSION },
        }
      )

      expect(response.status()).toBe(200)
      const body = await response.json()
      validateSchema(body, OtpVerifySchema, 'OTP verify')
    })

    await test.step('Submit signup', async () => {
      const response = await request.post(
        '/api/v2/public/account/authen/signup',
        {
          data: { phone: user.phone },
          headers: { 'x-app-version': APP_VERSION },
        }
      )

      expect(response.status()).toBe(200)
      const body = await response.json()
      validateSchema(body, SignupSchema, 'Signup')
      expect(body.data.phone).toBe(user.phone)
    })

    await test.step('Setup PIN', async () => {
      const response = await request.post(
        '/api/v2/public/account/authen/signup/pin',
        {
          data: {
            phone: user.phone,
            pincode: user.pincode,
            confirm_pincode: user.pincode,
          },
          headers: { 'x-app-version': APP_VERSION },
        }
      )

      expect(response.status()).toBe(200)
      const body = await response.json()
      validateSchema(body, PinSetupSchema, 'PIN setup')
    })
  })
})
