import { test, expect } from '@playwright/test'
import dotenv from 'dotenv'

dotenv.config()
const firebaseAPIKey = process.env.FIREBASE_API_KEY
const baseUrl = process.env.API_BASE_URL
const appVersion = process.env.X_APP_VERSION || ''

const signupEndpoints = {
  employeeId: {
    signup: '/api/v2/public/account/signup/employee-id',
    addPhoneRequest: '/api/v2/public/account/signup/employee-id/add-phone?verification_method=otp&action=request',
    addPhoneVerify: '/api/v2/public/account/signup/employee-id/add-phone?verification_method=otp&action=verify',
  },
  verifyPin: '/api/v1/user/account/profile/pincode/create',
}

const firebaseEndpoints = {
  signup: 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=',
  secureToken: 'https://securetoken.googleapis.com/v1/token?key=',
}

const userEndpoints = {
  profile: '/api/v1/user/account/profile',
  logout: '/api/v1/user/account/profile/logout',
}

const endpoints = {
  signupEmployeeId:
    `${baseUrl}${signupEndpoints.employeeId.signup}`,
  verifySignupEmployeeIdAddPhone:
    `${baseUrl}${signupEndpoints.employeeId.addPhoneRequest}`,
  verifySignupEmployeeIdAddPhoneVerify:
    `${baseUrl}${signupEndpoints.employeeId.addPhoneVerify}`,
  signupFirebase:
    `${firebaseEndpoints.signup}${firebaseAPIKey}`,
  secureFirebaseToken:
    `${firebaseEndpoints.secureToken}${firebaseAPIKey}`,
  verifyPin:
    `${baseUrl}${signupEndpoints.verifyPin}`,
  userProfile:
    `${baseUrl}${userEndpoints.profile}`,
  userLogout:
    `${baseUrl}${userEndpoints.logout}`,
}

const employeeData = {
  employee_id: 'benzpassport01',
  passport_no: 'A260422',
  company_id: 1288,
  phone: '0881001995',
  otp: '199119',
  firstName: 'Benz',
  pinCode: '000000',
}



test.describe('Signup by Employee ID', () => {
  test('signup with valid employee id and passport number', async ({
    request,
  }) => {
    let authChallenge: string
    let refCode: string
    let firebaseToken: string
    let firebaseRefreshToken: string
    let idTokenBeforeVerifyPin: string
    let idTokenAfterVerifyPin: string

    await test.step('Step 1: Input Employee ID and Passport Number', async () => {
      const signupEmployeeIdResponse = await request.post(
        endpoints.signupEmployeeId,
        {
          data: {
            employee_id: employeeData.employee_id,
            identity: employeeData.passport_no,
            company_id: employeeData.company_id,
          },
        }
      )

      const signupEmployeeIdResponseBody = await signupEmployeeIdResponse.json()

      expect(signupEmployeeIdResponseBody.is_signup).toBe(false)
      expect(
        typeof signupEmployeeIdResponseBody.verification_info.auth_challenge
      ).toBe('string')

      authChallenge =
        signupEmployeeIdResponseBody.verification_info.auth_challenge
    })

    await test.step('Step 2: Input Phone Number and Request OTP', async () => {
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

      expect(typeof verifyAddPhoneResponseBody.verification.ref_code).toBe(
        'string'
      )

      refCode = verifyAddPhoneResponseBody.verification.ref_code
    })

    await test.step('Step 3: Verify OTP and Signup', async () => {
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

      expect(
        verifyEmployeeIdSignupResponseBody.verification.token
      ).not.toBeNull()
      expect(
        verifyEmployeeIdSignupResponseBody.verification.profile.first_name
      ).toBe(employeeData.firstName)
      expect(
        verifyEmployeeIdSignupResponseBody.verification.profile.phone
      ).toBe(employeeData.phone)

      firebaseToken = verifyEmployeeIdSignupResponseBody.verification.token
    })

    await test.step('Step 4: Signup Firebase with Custom Token', async () => {
      const firebaseAuthResponse = await request.post(
        endpoints.signupFirebase,
        {
          data: {
            token: firebaseToken,
            returnSecureToken: true,
          },
        }
      )

      const firebaseResponseBody = await firebaseAuthResponse.json()

      expect(firebaseResponseBody.kind).toBe(
        'identitytoolkit#VerifyCustomTokenResponse'
      )
      expect(typeof firebaseResponseBody.idToken).toBe('string')
      expect(typeof firebaseResponseBody.refreshToken).toBe('string')
      expect(firebaseResponseBody.expiresIn).toBe('3600')
      expect(firebaseResponseBody.isNewUser).toBe(false)

      firebaseRefreshToken = firebaseResponseBody.refreshToken
    })

    await test.step('Step 5: Get Secure Token from Firebase Before PIN Code Verify', async () => {
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

      expect(typeof secureTokenBeforePinResponseBody.access_token).toBe(
        'string'
      )
      expect(secureTokenBeforePinResponseBody.expires_in).toBe('3600')
      expect(secureTokenBeforePinResponseBody.token_type).toBe('Bearer')
      expect(typeof secureTokenBeforePinResponseBody.refresh_token).toBe(
        'string'
      )
      expect(typeof secureTokenBeforePinResponseBody.id_token).toBe('string')
      expect(typeof secureTokenBeforePinResponseBody.user_id).toBe('string')
      expect(typeof secureTokenBeforePinResponseBody.project_id).toBe('string')

      idTokenBeforeVerifyPin = secureTokenBeforePinResponseBody.id_token
    })

    await test.step('Step 6: Verify PIN Code', async () => {
      const verifyPinResponse = await request.post(endpoints.verifyPin, {
        headers: {
          Authorization: `Bearer ${idTokenBeforeVerifyPin}`,
          'x-app-version': appVersion,
        },
        data: {
          pincode: employeeData.pinCode,
        },
      })

      const verifyPinResponseBody = await verifyPinResponse.json()
      expect(verifyPinResponseBody.message).toBe('Create PIN successfully')
    })

    await test.step('Step 7: Get Secure Token from Firebase After PIN Code Verify', async () => {
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

      expect(typeof secureTokenAfterPinResponseBody.access_token).toBe('string')
      expect(secureTokenAfterPinResponseBody.expires_in).toBe('3600')
      expect(secureTokenAfterPinResponseBody.token_type).toBe('Bearer')
      expect(typeof secureTokenAfterPinResponseBody.refresh_token).toBe(
        'string'
      )
      expect(typeof secureTokenAfterPinResponseBody.id_token).toBe('string')
      expect(typeof secureTokenAfterPinResponseBody.user_id).toBe('string')
      expect(typeof secureTokenAfterPinResponseBody.project_id).toBe('string')

      idTokenAfterVerifyPin = secureTokenAfterPinResponseBody.id_token
    })

    await test.step('Step 8: Get User Profile After Successfully Signup', async () => {
      const userProfileResponse = await request.get(endpoints.userProfile, {
        headers: {
          Authorization: `Bearer ${idTokenAfterVerifyPin}`,
          'x-app-version': appVersion,
        },
      })

      const userProfileResponseBody = await userProfileResponse.json()

      expect(userProfileResponseBody.profile.signup_at).not.toBeNull()
      expect(userProfileResponseBody.profile.first_name).toBe(
        employeeData.firstName
      )
      expect(userProfileResponseBody.profile.phone).toBe(employeeData.phone)
      expect(userProfileResponseBody.profile.employee_id).toBe(
        employeeData.employee_id
      )
      expect(userProfileResponseBody.profile.company_id).toBe(
        employeeData.company_id.toString()
      )
      expect(userProfileResponseBody.profile.passport_no).toBe(
        employeeData.passport_no
      )
      expect(userProfileResponseBody.profile.phone).toBe(employeeData.phone)
    })

    await test.step('Step 9: Logout User', async () => {
      const logoutResponse = await request.post(endpoints.userLogout, {
        headers: {
          Authorization: `Bearer ${idTokenAfterVerifyPin}`,
          'x-app-version': appVersion,
        },
      })

      const logoutResponseBody = await logoutResponse.json()
      expect(logoutResponseBody.message).toBe('Logout successfully')
    })
  })
})
