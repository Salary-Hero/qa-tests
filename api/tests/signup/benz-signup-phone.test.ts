import { test, expect } from '@playwright/test'

const endpoints = {
  signupPhone:
    'https://apiv2-staging.salary-hero.com/api/v2/public/account/signup/phone',
  verifyPhone:
    'https://apiv2-staging.salary-hero.com/api/v2/public/account/signup/phone?action=verify',
  signupFirebase:
    'https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=AIzaSyBeV5kfq740yW7LLhz_W2fPalGmd34gSXk',
}

const employeeData = {
  phone: '0881001994',
  otp: '199119',
  firstName: 'Benz',
}

test.describe('Signup by Phone', () => {
  test('signup with valid phone number', async ({ request }) => {
    // 1. Input Phone Number
    const response = await request.post(endpoints.signupPhone, {
      data: {
        phone: employeeData.phone,
      },
    })

    const responseBody = await response.json()
    expect(responseBody.is_signup).toBe(false)
    expect(responseBody.next_state).toBe('signup.phone.verify')
    expect(typeof responseBody.verification_info.ref_code).toBe('string')

    const refCode = responseBody.verification_info.ref_code

    // 2. Verify Phone Signup
    const verifyResponse = await request.post(endpoints.verifyPhone, {
      data: {
        phone: employeeData.phone,
        ref_code: refCode,
        code: employeeData.otp,
      },
    })

    const verifyResponseBody = await verifyResponse.json()
    console.log('verifyResponseBody Body: ', verifyResponseBody)

    expect(verifyResponseBody.is_signup).toBe(true)
    expect(verifyResponseBody.next_state).toBe('user.profile')
    expect(verifyResponseBody.verification_info.token).not.toBeNull()
    expect(verifyResponseBody.verification_info.profile.first_name).toBe(
      employeeData.firstName
    )
    expect(verifyResponseBody.verification_info.profile.phone).toBe(
      employeeData.phone
    )

    const firebaseToken = verifyResponseBody.verification_info.token

    // 3. Signup Firebase
    const firebaseResponse = await request.post(endpoints.signupFirebase, {
      data: {
        token: firebaseToken,
        returnSecureToken: true,
      },
    })

    const firebaseResponseBody = await firebaseResponse.json()
    console.log('firebaseResponseBody Body: ', firebaseResponseBody)
  })
})
