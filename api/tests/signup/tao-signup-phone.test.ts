import { test, expect } from '@playwright/test';

const endpoints = {
  signupPhone: 'https://apiv2-staging.salary-hero.com/api/v2/public/account/signup/phone',
  verifyPhone: 'https://apiv2-staging.salary-hero.com/api/v2/public/account/signup/phone?action=verify',
  firebaseAuthentication: 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=AIzaSyBeV5kfq740yW7LLhz_W2fPalGmd34gSXk',
  firebaseToken: 'https://securetoken.googleapis.com/v1/token?key=AIzaSyBeV5kfq740yW7LLhz_W2fPalGmd34gSXk',
  createPin: 'https://apiv2-staging.salary-hero.com/api/v1/user/account/profile/pincode/create',
  getUserProfile: 'https://apiv2-staging.salary-hero.com/api/v1/user/account/profile'
}

const employeeData = {
  phone: '0881000051',
  otp: '199119',
  pinCode: '000000',
  firstName: 'Tao',
  lastName: 'Phone Signup'
}

const appVersion = '5.4.1'


test.describe('Signup by Phone', () => {
  test('signup with valid phone number', async({ request }) => {
    let refCode = '';
    let tokenBeforeAuth = '';
    let firebaseRefreshToken = '';
    let idTokenBeforeCreatePin = '';
    let idTokenAfterCreatePin = '';

    test.step('Step 1: Input Phone number', async () => {
      const response = await request.post(endpoints.signupPhone, {
        data: {
          phone: employeeData.phone
        }
      })

      const responseBody = await response.json();
      expect(responseBody.is_signup).toBe(false);
      expect(responseBody.next_state).toBe('signup.phone.verify');
      expect(typeof responseBody.verification_info.ref_code).toBe('string');

      refCode = responseBody.verification_info.ref_code;
    })

    test.step('Step 2: Verify Phone Signup', async () => {
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

      tokenBeforeAuth = verifyResponseBody.verification_info.token;
    })

    test.step('Step 3: Signup Firebase', async () => {
      // 3. Signup Firebase
      const firebaseAuthResponse = await request.post(endpoints.firebaseAuthentication, {
        data: {
          token: tokenBeforeAuth,
          returnSecureToken: true
        }
      })

      const firebaseAuthResponseBody = await firebaseAuthResponse.json();
      expect(firebaseAuthResponseBody.kind).toBe('identitytoolkit#VerifyCustomTokenResponse')
      expect(typeof firebaseAuthResponseBody.idToken).toBe('string')
      expect(typeof firebaseAuthResponseBody.refreshToken).toBe('string')
      expect(firebaseAuthResponseBody.expiresIn).toBe('3600')
      expect(firebaseAuthResponseBody.isNewUser).toBe(false)

      firebaseRefreshToken = firebaseAuthResponseBody.refreshToken
    })

    test.step('Step 4: Token Firebase Before PIN code verify', async () => {
      const firebaseTokenBeforePinCodeResponse = await request.post(endpoints.firebaseToken, {
        data: {
          grant_type: 'refresh_token',
          refresh_token: firebaseRefreshToken
        }
      })
      
      const firebaseTokenBeforePinCodeResponseBody = await firebaseTokenBeforePinCodeResponse.json()
      expect(typeof firebaseTokenBeforePinCodeResponseBody.access_token).toBe('string')
      expect(typeof firebaseTokenBeforePinCodeResponseBody.id_token).toBe('string')

      idTokenBeforeCreatePin = firebaseTokenBeforePinCodeResponseBody.id_token
    })

    test.step('Step 5: Create PIN code', async () => {
      const createPinCodeResponse = await request.post(endpoints.createPin, {
        headers: {
          'Authorization': `Bearer ${idTokenBeforeCreatePin}`,
          'x-app-version': appVersion
        },
        data: {
          pincode: employeeData.pinCode
        }
      })

      const createPinCodeResponseBody = await createPinCodeResponse.json()
      expect(createPinCodeResponseBody.message).toBe('Create PIN successfully')
    })

    test.step('Step 6: Token Firebase After PIN code verify', async () => {
      const firebaseTokenAfterPinCodeResponse = await request.post(endpoints.firebaseToken, {
        data: {
          grant_type: 'refresh_token',
          refresh_token: firebaseRefreshToken
        }
      })
      const firebaseTokenAfterPinCodeResponseBody = await firebaseTokenAfterPinCodeResponse.json()
      expect(typeof firebaseTokenAfterPinCodeResponseBody.access_token).toBe('string')
      expect(typeof firebaseTokenAfterPinCodeResponseBody.id_token).toBe('string')
      idTokenAfterCreatePin = firebaseTokenAfterPinCodeResponseBody.id_token
    })

    test.step('Step 7: Verify User Profile', async () => {
      const getProfileResponse = await request.get(endpoints.getUserProfile, {
        headers: {
          'Authorization': `Bearer ${idTokenAfterCreatePin}`,
          'x-app-version': appVersion
        }
      })

      const getProfileResponseBody = await getProfileResponse.json()
      expect(getProfileResponseBody.profile.first_name).toBe(employeeData.firstName)
      expect(getProfileResponseBody.profile.last_name).toBe(employeeData.lastName)
      expect(getProfileResponseBody.profile.phone).toBe(employeeData.phone)
      expect(getProfileResponseBody.profile.signup_at).not.toBeNull()
    })
  })
})