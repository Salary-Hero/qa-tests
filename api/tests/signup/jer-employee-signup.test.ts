import { test, expect } from '@playwright/test'

const NationalIdSignupEndpoint = {
  signupByNationalID:
    'https://apiv2-staging.salary-hero.com/api/v3/public/account/signup/employee-id',

  requestPhone:
    'https://apiv2-staging.salary-hero.com/api/v2/public/account/signup/employee-id/add-phone?verification_method=otp&action=request',

  verifyEmployeeSignup:
    'https://apiv2-staging.salary-hero.com/api/v2/public/account/signup/employee-id/add-phone?verification_method=otp&action=verify',
}

const NationalIdSignupData = {
  employee_id: '094348',
  identity: '0943344433332',
  company_id: 1288,
  phone: '0881000052',
  code: '199119',
}

//signup by National ID
test.describe('National ID Signup', () => {
  test('Signup by National ID', async ({ request }) => {
    const response = await request.post(
      NationalIdSignupEndpoint.signupByNationalID,
      {
        data: {
          employee_id: NationalIdSignupData.employee_id,
          identity: NationalIdSignupData.identity,
          company_id: NationalIdSignupData.company_id,
        },
      }
    )
    const responseBody = await response.json()
    console.log('National ID Signup Response:', responseBody)

    expect(responseBody.is_signup).toBe(false)
    expect(responseBody.verification_info.auth_challenge).not.toBeNull()

    //request Phone
    const requestPhoneResponse = await request.post(
      NationalIdSignupEndpoint.requestPhone,
      {
        data: {
          phone: NationalIdSignupData.phone,
          auth_challenge: responseBody.verification_info.auth_challenge,
        },
      }
    )
    const requestPhoneResponseBody = await requestPhoneResponse.json()
    console.log('request phone response:', requestPhoneResponseBody)

    expect(requestPhoneResponseBody.verification.ref_code).not.toBeNull()

    //verify employee
    const verifyEmployeeIdSignup = await request.post(
      NationalIdSignupEndpoint.verifyEmployeeSignup,
      {
        data: {
          phone: NationalIdSignupData.phone,
          auth_challenge: responseBody.verification_info.auth_challenge,

          verification: {
            code: NationalIdSignupData.code,
            ref_code: requestPhoneResponseBody.verification.ref_code,
          },
        },
      }
    )
    const verifyEmployeeIdSignupBody = await verifyEmployeeIdSignup.json()
    console.log(
      'verify employee id signup response:',
      verifyEmployeeIdSignupBody
    )
  })
})
