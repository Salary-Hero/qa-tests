import { test, expect, request } from '@playwright/test'
import dotenv from 'dotenv'

dotenv.config()
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY
const BASE_URL = process.env.BASE_URL
const VERSION_APP = process.env.VERSION_APP || ''

const nationalIdSignupEndpoint = {
  signupByNationalID: `${BASE_URL}/api/v3/public/account/signup/employee-id`,

  requestPhone: `${BASE_URL}/api/v2/public/account/signup/employee-id/add-phone?verification_method=otp&action=request`,

  verifyEmployeeSignup: `${BASE_URL}/api/v2/public/account/signup/employee-id/add-phone?verification_method=otp&action=verify`,

  verifyFirebase: `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_API_KEY}`,

  verifyTokenFirebaseBeforeCreatePin: `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`,

  createPinCode: `${BASE_URL}/api/v1/user/account/profile/pincode/create`,

  verifyTokenFirebase: `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`,

  getProfile: `${BASE_URL}/api/v1/user/account/profile`,
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
test.describe('Signup by national ID and employee ID', () => {
  test('employee and national ID', async ({ request }) => {
    let authChallenge: string
    let refCode: string
    let firebaseToken: string
    let verifyTokenBeforeCreatePin: string
    let accessToken: string
    let refreshToken: string

    await test.step('Step 1: Input employee ID and national ID', async () => {
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
      authChallenge = responseBody.verification_info.auth_challenge
    })
    await test.step('Step 2: Request OTP to phone number', async () => {
      const requestPhoneResponse = await request.post(
        nationalIdSignupEndpoint.requestPhone,
        {
          data: {
            phone: nationalIdSignupData.phone,
            auth_challenge: authChallenge,
          },
        }
      )
      const requestPhoneResponseBody = await requestPhoneResponse.json()
      console.log('Request Phone Response Body:', requestPhoneResponseBody)
      expect(requestPhoneResponseBody.verification.ref_code).not.toBeNull()
      refCode = requestPhoneResponseBody.verification.ref_code
    })
    await test.step('Step 3: Verify Employee', async () => {
      const verifyEmployeeIdSignup = await request.post(
        nationalIdSignupEndpoint.verifyEmployeeSignup,
        {
          data: {
            phone: nationalIdSignupData.phone,
            auth_challenge: authChallenge,

            verification: {
              code: nationalIdSignupData.code,
              ref_code: refCode,
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
      firebaseToken = verifyEmployeeIdSignupBody.verification.token
    })
    await test.step('Step 4: Verify Firebase token', async () => {
      const firebaseResponse = await request.post(
        nationalIdSignupEndpoint.verifyFirebase,
        {
          data: {
            token: firebaseToken,
            returnSecureToken: true,
          },
        }
      )
      const firebaseResponseBody = await firebaseResponse.json()
      console.log('Firebase Response Body:', firebaseResponseBody)

      expect(firebaseResponseBody.idToken).not.toBeNull()
      expect(firebaseResponseBody.refreshToken).not.toBeNull()
      expect(firebaseResponseBody.kind).toBe(
        'identitytoolkit#VerifyCustomTokenResponse'
      )
      refreshToken = firebaseResponseBody.refreshToken
    })
    await test.step('Step 5: Verify token before create PIN', async () => {
      const verifyTokenBeforeCreatePinResponse = await request.post(
        nationalIdSignupEndpoint.verifyTokenFirebaseBeforeCreatePin,
        {
          data: {
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
          },
        }
      )
      const verifyTokenBeforeCreatePinResponseBody =
        await verifyTokenBeforeCreatePinResponse.json()
      console.log(
        'Verify Token Before Create PIN Response Body:',
        verifyTokenBeforeCreatePinResponseBody
      )

      expect(verifyTokenBeforeCreatePinResponseBody.idToken).not.toBeNull()
      expect(verifyTokenBeforeCreatePinResponseBody.refreshToken).not.toBeNull()
      verifyTokenBeforeCreatePin =
        verifyTokenBeforeCreatePinResponseBody.id_token
      refreshToken = verifyTokenBeforeCreatePinResponseBody.refresh_token
    })

    await test.step('Step 6: Verify Create PIN code', async () => {
      const createPinResponse = await request.post(
        nationalIdSignupEndpoint.createPinCode,
        {
          headers: {
            Authorization: `Bearer ${verifyTokenBeforeCreatePin}`,
            'x-app-version': VERSION_APP,
          },
          data: {
            pincode: nationalIdSignupData.pinCode,
          },
        }
      )
      const createPinResponseBody = await createPinResponse.json()
      console.log('Create PIN Response Body:', createPinResponseBody)

      expect(createPinResponseBody.message).toBe('Create PIN successfully')
    })

    await test.step('Step 7: Verify token after create PIN', async () => {
      const verifyTokenResponse = await request.post(
        nationalIdSignupEndpoint.verifyTokenFirebase,
        {
          data: {
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
          },
        }
      )
      const verifyTokenResponseBody = await verifyTokenResponse.json()
      console.log(
        'Verify Token After Create PIN Response Body:',
        verifyTokenResponseBody
      )
      expect(verifyTokenResponseBody.access_token).not.toBeNull()
      expect(verifyTokenResponseBody.expires_in).not.toBeNull()
      expect(verifyTokenResponseBody.refresh_token).not.toBeNull()
      expect(verifyTokenResponseBody.id_token).not.toBeNull()

      accessToken = verifyTokenResponseBody.access_token
    })

    await test.step('Step 8: Verify Get profile', async () => {
      const getProfileResponse = await request.get(
        nationalIdSignupEndpoint.getProfile,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'x-app-version': VERSION_APP,
          },
        }
      )
      const getProfileResponseBody = await getProfileResponse.json()
      console.log('Get Profile Response Body:', getProfileResponseBody)
    })
  })
})
