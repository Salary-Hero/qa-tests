import { test, expect, request } from '@playwright/test'
import { verify } from 'node:crypto'
import { ref } from 'node:process'

const nationalIdSignupEndpoint = {
  signupByNationalID:
    'https://apiv2-staging.salary-hero.com/api/v3/public/account/signup/employee-id',

  requestPhone:
    'https://apiv2-staging.salary-hero.com/api/v2/public/account/signup/employee-id/add-phone?verification_method=otp&action=request',

  verifyEmployeeSignup:
    'https://apiv2-staging.salary-hero.com/api/v2/public/account/signup/employee-id/add-phone?verification_method=otp&action=verify',

  verifyFirebase:
    'https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=AIzaSyBeV5kfq740yW7LLhz_W2fPalGmd34gSXk',

  verifyTokenFirebaseBeforeCreatePin:
    'https://securetoken.googleapis.com/v1/token?key=AIzaSyBeV5kfq740yW7LLhz_W2fPalGmd34gSXk',

  createPinCode:
    'https://apiv2-staging.salary-hero.com/api/v1/user/account/profile/pincode/create',

  verifyTokenFirebase:
    'https://securetoken.googleapis.com/v1/token?key=AIzaSyBeV5kfq740yW7LLhz_W2fPalGmd34gSXk',

  getProfile:
    'https://apiv2-staging.salary-hero.com/api/v1/user/account/profile',

  logout:
    'https://apiv2-staging.salary-hero.com/api/v1/user/account/profile/logout',
}

const nationalIdSignupData = {
  employee_id: '094348',
  identity: '0943344433332',
  company_id: 1288,
  phone: '0881000052',
  code: '199119',
  pinCode: '000000',
}

//signup by National ID and employee ID
test.describe('National ID Signup', () => {
  test('Signup by National ID', async ({ request }) => {
    const response = await request.post(
      nationalIdSignupEndpoint.signupByNationalID,
      {
        data: {
          employee_id: nationalIdSignupData.employee_id,
          identity: nationalIdSignupData.identity,
          company_id: nationalIdSignupData.company_id,
        },
      }
    )
    const responseBody = await response.json()
    console.log('National ID Signup Response:', responseBody)

    expect(responseBody.is_signup).toBe(false)
    expect(responseBody.verification_info.auth_challenge).not.toBeNull()

    //request Phone
    const requestPhoneResponse = await request.post(
      nationalIdSignupEndpoint.requestPhone,
      {
        data: {
          phone: nationalIdSignupData.phone,
          auth_challenge: responseBody.verification_info.auth_challenge,
        },
      }
    )
    const requestPhoneResponseBody = await requestPhoneResponse.json()
    console.log('request phone response:', requestPhoneResponseBody)

    expect(requestPhoneResponseBody.verification.ref_code).not.toBeNull()

    //verify employee
    const verifyEmployeeIdSignup = await request.post(
      nationalIdSignupEndpoint.verifyEmployeeSignup,
      {
        data: {
          phone: nationalIdSignupData.phone,
          auth_challenge: responseBody.verification_info.auth_challenge,

          verification: {
            code: nationalIdSignupData.code,
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

    expect(verifyEmployeeIdSignupBody.verification.token).not.toBeNull()
    expect(verifyEmployeeIdSignupBody.verification.profile.phone).toBe(
      nationalIdSignupData.phone
    )
    expect(verifyEmployeeIdSignupBody.verification.profile.employee_id).toBe(
      nationalIdSignupData.employee_id
    )
    expect(verifyEmployeeIdSignupBody.verification.profile.national_id).toBe(
      nationalIdSignupData.identity
    )
    expect(verifyEmployeeIdSignupBody.verification.company.id).toBe(
      nationalIdSignupData.company_id
    )
    expect(verifyEmployeeIdSignupBody.verification.profile.status).toBe(
      'active'
    )

    //signup firebase
    const firebaseResponse = await request.post(
      nationalIdSignupEndpoint.verifyFirebase,
      {
        data: {
          token: verifyEmployeeIdSignupBody.verification.token,
          returnSecureToken: true,
        },
      }
    )
    const firebaseResponseBody = await firebaseResponse.json()
    console.log('firebase response:', firebaseResponseBody)

    expect(firebaseResponseBody.idToken).not.toBeNull()
    expect(firebaseResponseBody.refreshToken).not.toBeNull()
    expect(firebaseResponseBody.kind).toBe(
      'identitytoolkit#VerifyCustomTokenResponse'
    )

    //before create PIN code, verify token
    const veriufyTokenBeforeCreatePinResponse = await request.post(
      nationalIdSignupEndpoint.verifyTokenFirebaseBeforeCreatePin,
      {
        data: {
          grant_type: 'refresh_token',
          refresh_token: firebaseResponseBody.refreshToken,
        },
      }
    )
    const verifyTokenBeforeCreatePinResponseBody =
      await veriufyTokenBeforeCreatePinResponse.json()
    console.log(
      'verify token before create pin response:',
      verifyTokenBeforeCreatePinResponseBody
    )

    //create PIn code
    const createPinResponse = await request.post(
      nationalIdSignupEndpoint.createPinCode,
      {
        headers: {
          Authorization: `Bearer ${verifyTokenBeforeCreatePinResponseBody.id_token}`,
          'x-app-version': '4.7.0',
        },
        data: {
          pincode: nationalIdSignupData.pinCode,
        },
      }
    )
    const createPinResponseBody = await createPinResponse.json()
    console.log('CreatePinResponseBody', createPinResponseBody)

    expect(createPinResponseBody.message).toBe('Create PIN successfully')

    //verify token
    const verifyTokenResponse = await request.post(
      nationalIdSignupEndpoint.verifyTokenFirebase,
      {
        data: {
          grant_type: 'refresh_token',
          refresh_token: firebaseResponseBody.refreshToken,
        },
      }
    )
    const verifyTokenResponseBody = await verifyTokenResponse.json()
    console.log('verify token response:', verifyTokenResponseBody)

    expect(verifyTokenResponseBody.access_token).not.toBeNull()
    expect(verifyTokenResponseBody.expires_in).not.toBeNull()
    expect(verifyTokenResponseBody.refresh_token).not.toBeNull()
    expect(verifyTokenResponseBody.id_token).not.toBeNull()

    //Get profile
    const getProfileResponse = await request.get(
      nationalIdSignupEndpoint.getProfile,
      {
        headers: {
          Authorization: `Bearer ${verifyTokenResponseBody.id_token}`,
          'x-app-version': '4.7.0',
        },
      }
    )
    const getProfileResponseBody = await getProfileResponse.json()
    console.log('get profile response:', getProfileResponseBody)

    expect(getProfileResponseBody.profile.has_pin_code).not.toBeNull()
    expect(getProfileResponseBody.profile.phone).toBe(
      nationalIdSignupData.phone
    )
    expect(getProfileResponseBody.profile.user_id).toBe(
      getProfileResponseBody.profile.user_id
    )
    expect(getProfileResponseBody.profile.status).toBe('active')
    expect(getProfileResponseBody.profile.signup_at).not.toBeNull()
    expect(getProfileResponseBody.profile.company_id).toBe(
      getProfileResponseBody.profile.company_id
    )
  })
})
