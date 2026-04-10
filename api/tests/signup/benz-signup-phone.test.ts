import { test, expect } from '@playwright/test'

const endpoints = {
  signupPhone:
    'https://apiv2-staging.salary-hero.com/api/v2/public/account/signup/phone',
  verifyPhone:
    'https://apiv2-staging.salary-hero.com/api/v2/public/account/signup/phone?action=verify',
  signupFirebase:
    'https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=AIzaSyBeV5kfq740yW7LLhz_W2fPalGmd34gSXk',
  secureFirebaseToken: 'https://securetoken.googleapis.com/v1/token?key=AIzaSyBeV5kfq740yW7LLhz_W2fPalGmd34gSXk',
  verifyPin: 'https://apiv2-staging.salary-hero.com/api/v1/user/account/profile/pincode/create',
  userProfile: 'https://apiv2-staging.salary-hero.com/api/v1/user/account/profile',
  userLogout: 'https://apiv2-staging.salary-hero.com/api/v1/user/account/profile/logout'
}

const employeeData = {
  phone: '0881001994',
  otp: '199119',
  firstName: 'Benz',
  pinCode: '000000'
}

const appVersion = '5.4.1'

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
    // console.log('verifyResponseBody Body: ', verifyResponseBody)

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
    const firebaseAuthResponse = await request.post(endpoints.signupFirebase, {
      data: {
        token: firebaseToken,
        returnSecureToken: true,
      },
    })

    const firebaseResponseBody = await firebaseAuthResponse.json()
    // console.log('firebaseResponseBody Body: ', firebaseResponseBody)

    expect(firebaseResponseBody.kind).toBe('identitytoolkit#VerifyCustomTokenResponse');
    expect(typeof firebaseResponseBody.idToken).toBe('string');
    expect(typeof firebaseResponseBody.refreshToken).toBe('string');
    expect(firebaseResponseBody.expiresIn).toBe('3600');
    expect(firebaseResponseBody.isNewUser).toBe(false);

    const firebaseRefreshToken = firebaseResponseBody.refreshToken;

    // 4. Token Firebase Before PIN Code Verify
    const secureTokenBeforePinResponse = await request.post(endpoints.secureFirebaseToken,{
      data: {
        grant_type: 'refresh_token',
        refresh_token: firebaseRefreshToken
      }
    })

    const secureTokenBeforePinResponseBody = await secureTokenBeforePinResponse.json();
    console.log('secureTokenBeforePinResponseBody Body: ', secureTokenBeforePinResponseBody)

    expect(typeof secureTokenBeforePinResponseBody.access_token).toBe('string');
    expect(secureTokenBeforePinResponseBody.expires_in).toBe('3600');
    expect(secureTokenBeforePinResponseBody.token_type).toBe('Bearer');
    expect(typeof secureTokenBeforePinResponseBody.refresh_token).toBe('string');
    expect(typeof secureTokenBeforePinResponseBody.id_token).toBe('string');
    expect(typeof secureTokenBeforePinResponseBody.user_id).toBe('string');
    expect(typeof secureTokenBeforePinResponseBody.project_id).toBe('string');

    const idTokenBeforeVerifyPin = secureTokenBeforePinResponseBody.id_token;

    // 5. Verify PIN Code
    const verifyPinResponse = await request.post(endpoints.verifyPin, {
      headers: {
        Authorization: `Bearer ${idTokenBeforeVerifyPin}`,
        'x-app-version': '5.4.1'
      },
      data: {
        pincode: employeeData.pinCode
      }
    })

    const verifyPinResponseBody = await verifyPinResponse.json();
    console.log('verifyPinResponseBody Body: ', verifyPinResponseBody);

    expect(verifyPinResponseBody.message).toBe('Create PIN successfully');

    // 6. Token Firebase Before PIN Code Verify
    const secureTokenAfterPinResponse = await request.post(endpoints.secureFirebaseToken,{
      data: {
        grant_type: 'refresh_token',
        refresh_token: firebaseRefreshToken
      }
    })

    const secureTokenAfterPinResponseBody = await secureTokenAfterPinResponse.json();
    console.log('secureTokenAfterPinResponseBody Body: ', secureTokenAfterPinResponseBody)

    expect(typeof secureTokenAfterPinResponseBody.access_token).toBe('string');
    expect(secureTokenAfterPinResponseBody.expires_in).toBe('3600');
    expect(secureTokenAfterPinResponseBody.token_type).toBe('Bearer');
    expect(typeof secureTokenAfterPinResponseBody.refresh_token).toBe('string');
    expect(typeof secureTokenAfterPinResponseBody.id_token).toBe('string');
    expect(typeof secureTokenAfterPinResponseBody.user_id).toBe('string');
    expect(typeof secureTokenAfterPinResponseBody.project_id).toBe('string');

    const idTokenAfterVerifyPin = secureTokenAfterPinResponseBody.id_token;

    // 7. Get User Profile After Successfully Signup
    const userProfileResponse = await request.get(endpoints.userProfile, {
      headers: {
        Authorization: `Bearer ${idTokenAfterVerifyPin}`,
        'x-app-version': appVersion
      }
    })

    const userProfileResponseBody = await userProfileResponse.json();
    console.log('userProfileResponseBody Body: ', userProfileResponseBody);

    expect(userProfileResponseBody.profile.first_name).toBe(employeeData.firstName);
    expect(userProfileResponseBody.profile.phone).toBe(employeeData.phone);

    // 8. Logout User
    const logoutResponse = await request.post(endpoints.userLogout, {
      headers: {
        Authorization: `Bearer ${idTokenAfterVerifyPin}`,
        'x-app-version': appVersion
      }
    })

    const logoutResponseBody = await logoutResponse.json();
    console.log('logoutResponseBody Body: ', logoutResponseBody);

    expect(logoutResponseBody.message).toBe('Logout successfully');

  })
})
