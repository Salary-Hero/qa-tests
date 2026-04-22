import { test, expect } from '@playwright/test'

const endpoints = {
  signupEmployeeId:
    'https://apiv2-staging.salary-hero.com/api/v3/public/account/signup/employee-id',
  verifySignupEmployeeIdAddPhone:
    'https://apiv2-staging.salary-hero.com/api/v2/public/account/signup/employee-id/add-phone?verification_method=otp&action=request',
  verifySignupEmployeeIdAddPhoneVerify:
    'https://apiv2-staging.salary-hero.com/api/v2/public/account/signup/employee-id/add-phone?verification_method=otp&action=verify',
  signupFirebase:
    'https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=AIzaSyBeV5kfq740yW7LLhz_W2fPalGmd34gSXk',
  secureFirebaseToken:
    'https://securetoken.googleapis.com/v1/token?key=AIzaSyBeV5kfq740yW7LLhz_W2fPalGmd34gSXk',
  verifyPin:
    'https://apiv2-staging.salary-hero.com/api/v1/user/account/profile/pincode/create',
  userProfile:
    'https://apiv2-staging.salary-hero.com/api/v1/user/account/profile',
  userLogout:
    'https://apiv2-staging.salary-hero.com/api/v1/user/account/profile/logout',
}

const employeeData = {
  employee_id: 'benzpassport01',
  identity: 'A260422',
  company_id: 1288,
  phone: '0881001995',
  otp: '199119',
  firstName: 'Benz',
  pinCode: '000000',
}

const appVersion = '5.4.1'

test.describe('Signup by Employee ID', () => {
  test('signup with valid employee id and passport number', async ({
    request,
  }) => {
    // 1. Input Employee ID and Passport Number
    const signupEmployeeIdResponse = await request.post(
      endpoints.signupEmployeeId,
      {
        data: {
          employee_id: employeeData.employee_id,
          identity: employeeData.identity,
          company_id: employeeData.company_id,
        },
      }
    )

    const signupEmployeeIdResponseBody = await signupEmployeeIdResponse.json()
    // console.log('signupEmployeeIdResponseBody: ', signupEmployeeIdResponseBody)

    expect(signupEmployeeIdResponseBody.is_signup).toBe(false)
    expect(
      typeof signupEmployeeIdResponseBody.verification_info.auth_challenge
    ).toBe('string')

    const authChallenge =
      signupEmployeeIdResponseBody.verification_info.auth_challenge

    // 2. Input Phone Number
    const verifyAddPhoneResponse = await request.post(
      endpoints.verifySignupEmployeeIdAddPhone,
      {
        data: {
          phone: employeeData.phone,
          auth_challenge: authChallenge,
        },
      }
    )

    const verifyAddPhoneResponseBody = await verifyAddPhoneResponse.json()
    // console.log('verifyAddPhoneResponseBody: ', verifyAddPhoneResponseBody)

    expect(typeof verifyAddPhoneResponseBody.verification.ref_code).toBe(
      'string'
    )

    const refCode = verifyAddPhoneResponseBody.verification.ref_code

    // 3. Verify Phone Number - Employee ID Signup
    const verifyEmployeeIdSignupResponse = await request.post(
      endpoints.verifySignupEmployeeIdAddPhoneVerify,
      {
        data: {
          phone: employeeData.phone,
          auth_challenge: authChallenge,
          verification: {
            ref_code: refCode,
            code: employeeData.otp,
          },
        },
      }
    )

    const verifyEmployeeIdSignupResponseBody =
      await verifyEmployeeIdSignupResponse.json()
    // console.log('verifyEmployeeIdSignupResponseBody: ', verifyEmployeeIdSignupResponseBody)

    expect(verifyEmployeeIdSignupResponseBody.verification.token).not.toBeNull()
    expect(
      verifyEmployeeIdSignupResponseBody.verification.profile.first_name
    ).toBe(employeeData.firstName)
    expect(verifyEmployeeIdSignupResponseBody.verification.profile.phone).toBe(
      employeeData.phone
    )

    const firebaseToken = verifyEmployeeIdSignupResponseBody.verification.token

    // 4. Signup Firebase
    const firebaseAuthResponse = await request.post(endpoints.signupFirebase, {
      data: {
        token: firebaseToken,
        returnSecureToken: true,
      },
    })

    const firebaseResponseBody = await firebaseAuthResponse.json()
    // console.log('firebaseResponseBody Body: ', firebaseResponseBody)

    expect(firebaseResponseBody.kind).toBe(
      'identitytoolkit#VerifyCustomTokenResponse'
    )
    expect(typeof firebaseResponseBody.idToken).toBe('string')
    expect(typeof firebaseResponseBody.refreshToken).toBe('string')
    expect(firebaseResponseBody.expiresIn).toBe('3600')
    expect(firebaseResponseBody.isNewUser).toBe(false)

    const firebaseRefreshToken = firebaseResponseBody.refreshToken

    // 5. Token Firebase Before PIN Code Verify
    const secureTokenBeforePinResponse = await request.post(
      endpoints.secureFirebaseToken,
      {
        data: {
          grant_type: 'refresh_token',
          refresh_token: firebaseRefreshToken,
        },
      }
    )

    const secureTokenBeforePinResponseBody =
      await secureTokenBeforePinResponse.json()
    console.log(
      'secureTokenBeforePinResponseBody Body: ',
      secureTokenBeforePinResponseBody
    )

    expect(typeof secureTokenBeforePinResponseBody.access_token).toBe('string')
    expect(secureTokenBeforePinResponseBody.expires_in).toBe('3600')
    expect(secureTokenBeforePinResponseBody.token_type).toBe('Bearer')
    expect(typeof secureTokenBeforePinResponseBody.refresh_token).toBe('string')
    expect(typeof secureTokenBeforePinResponseBody.id_token).toBe('string')
    expect(typeof secureTokenBeforePinResponseBody.user_id).toBe('string')
    expect(typeof secureTokenBeforePinResponseBody.project_id).toBe('string')

    const idTokenBeforeVerifyPin = secureTokenBeforePinResponseBody.id_token

    // 6. Verify PIN Code
    const verifyPinResponse = await request.post(endpoints.verifyPin, {
      headers: {
        Authorization: `Bearer ${idTokenBeforeVerifyPin}`,
        'x-app-version': '5.4.1',
      },
      data: {
        pincode: employeeData.pinCode,
      },
    })

    const verifyPinResponseBody = await verifyPinResponse.json()
    console.log('verifyPinResponseBody Body: ', verifyPinResponseBody)

    expect(verifyPinResponseBody.message).toBe('Create PIN successfully')

    // 7. Token Firebase After PIN Code Verify
    const secureTokenAfterPinResponse = await request.post(
      endpoints.secureFirebaseToken,
      {
        data: {
          grant_type: 'refresh_token',
          refresh_token: firebaseRefreshToken,
        },
      }
    )

    const secureTokenAfterPinResponseBody =
      await secureTokenAfterPinResponse.json()
    console.log(
      'secureTokenAfterPinResponseBody Body: ',
      secureTokenAfterPinResponseBody
    )

    expect(typeof secureTokenAfterPinResponseBody.access_token).toBe('string')
    expect(secureTokenAfterPinResponseBody.expires_in).toBe('3600')
    expect(secureTokenAfterPinResponseBody.token_type).toBe('Bearer')
    expect(typeof secureTokenAfterPinResponseBody.refresh_token).toBe('string')
    expect(typeof secureTokenAfterPinResponseBody.id_token).toBe('string')
    expect(typeof secureTokenAfterPinResponseBody.user_id).toBe('string')
    expect(typeof secureTokenAfterPinResponseBody.project_id).toBe('string')

    const idTokenAfterVerifyPin = secureTokenAfterPinResponseBody.id_token

    // 8. Get User Profile After Successfully Signup
    const userProfileResponse = await request.get(endpoints.userProfile, {
      headers: {
        Authorization: `Bearer ${idTokenAfterVerifyPin}`,
        'x-app-version': appVersion,
      },
    })

    const userProfileResponseBody = await userProfileResponse.json()
    console.log('userProfileResponseBody Body: ', userProfileResponseBody)

    expect(userProfileResponseBody.profile.first_name).toBe(
      employeeData.firstName
    )
    expect(userProfileResponseBody.profile.phone).toBe(employeeData.phone)

    // 9. Logout User
    const logoutResponse = await request.post(endpoints.userLogout, {
      headers: {
        Authorization: `Bearer ${idTokenAfterVerifyPin}`,
        'x-app-version': appVersion,
      },
    })

    const logoutResponseBody = await logoutResponse.json()
    console.log('logoutResponseBody Body: ', logoutResponseBody)

    expect(logoutResponseBody.message).toBe('Logout successfully')
  })
})
