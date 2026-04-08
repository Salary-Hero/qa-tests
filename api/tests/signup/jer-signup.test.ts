import { test, expect } from '@playwright/test'

const testEndpoint = {
  phoneSignup:
    'https://apiv2-staging.salary-hero.com/api/v2/public/account/signup/phone',
  verifyPhoneSignup:
    'https://apiv2-staging.salary-hero.com/api/v2/public/account/signup/phone?action=verify',
}

const testData = {
  phone: '0881000052',
  otp: '199119',
}
test.describe('Phone Signup', () => {
  test('Signup by phone', async ({ request }) => {
    //API endpoint
    const response = await request.post(testEndpoint.phoneSignup, {
      data: {
        phone: testData.phone,
      },
    })

    const responseBody = await response.json()
    expect(responseBody.is_signup).toBe(false)
    //expect(responseBody.is_otp_sent).toBe(true);
    expect(responseBody.next_state).toBe('signup.phone.verify')
    expect(responseBody.verification_info.ref_code).toBe('salary-hero-bypass')

    //Verify Phone Signup
    const refCode = responseBody.verification_info.ref_code
    const verifyResponse = await request.post(testEndpoint.verifyPhoneSignup, {
      data: {
        phone: testData.phone,
        code: testData.otp,
        ref_code: refCode,
      },
    })
    const verifyResponseBody = await verifyResponse.json()
    console.log('verifyResponseBody', verifyResponseBody)

    expect(verifyResponseBody.is_signup).toBe(true)
    expect(verifyResponseBody.next_state).toBe('user.profile')
    expect(verifyResponseBody.verification_info.token).not.toBeNull()
    expect(verifyResponseBody.company_id).not.toBeNull()
  })
})
