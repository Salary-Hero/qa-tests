import { test, expect } from '@playwright/test';

const endpoints = {
  signupPhone: 'https://apiv2-staging.salary-hero.com/api/v2/public/account/signup/phone',
  verifyPhone: 'https://apiv2-staging.salary-hero.com/api/v2/public/account/signup/phone?action=verify'
}

const employeeData = {
  phone: '0881000051',
  otp: '199119',
}

test.describe('Signup by Phone', () => {
  test('signup with valid phone number', async({ request }) => {

    // 1. Input Phone number
    const response = await request.post(endpoints.signupPhone, {
      data: {
        phone: employeeData.phone
      }
    })

    const responseBody = await response.json();
    expect(responseBody.is_signup).toBe(false);
    expect(responseBody.next_state).toBe('signup.phone.verify');
    expect(typeof responseBody.verification_info.ref_code).toBe('string');

    const refCode = responseBody.verification_info.ref_code;

    // 2. Verify Phone Signup
    const verifyResponse = await request.post(endpoints.verifyPhone, {
      data: {
        phone: employeeData.phone,
        ref_code: refCode,
        code: employeeData.otp
      }
    })

    const verifyResponseBody = await verifyResponse.json();
    expect(verifyResponseBody.is_signup).toBe(true)
    expect(verifyResponseBody.next_state).toBe('user.profile')
    expect(verifyResponseBody.verification_info.token).not.toBeNull()
    expect(typeof verifyResponseBody.verification_info.token).toBe('string')
    expect(verifyResponseBody.verification_info.profile.first_name).toBe('Tao')
  })
})