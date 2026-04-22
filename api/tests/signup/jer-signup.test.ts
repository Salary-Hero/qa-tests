import { test, expect } from '@playwright/test'

const testEndpoint = {
  phoneSignup:
    'https://apiv2-staging.salary-hero.com/api/v2/public/account/signup/phone',
  verifyPhoneSignup:
    'https://apiv2-staging.salary-hero.com/api/v2/public/account/signup/phone?action=verify',

  verifyFirebase:
    'https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=AIzaSyBeV5kfq740yW7LLhz_W2fPalGmd34gSXk',

  VerifyTokenFirebase:
    'https://securetoken.googleapis.com/v1/token?key=AIzaSyBeV5kfq740yW7LLhz_W2fPalGmd34gSXk',

  createPinCode:
    'https://apiv2-staging.salary-hero.com/api/v1/user/account/profile/pincode/create',

  VerifyAfterTokenFirebase:
    'https://securetoken.googleapis.com/v1/token?key=AIzaSyBeV5kfq740yW7LLhz_W2fPalGmd34gSXk',

  getProfile:
    'https://apiv2-staging.salary-hero.com/api/v1/user/account/profile',
}

const testData = {
  phone: '0881000052',
  otp: '199119',
  pinCode: '000000',
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

    // Signup Firebase
    const firebaseResponse = await request.post(testEndpoint.verifyFirebase, {
      data: {
        token: verifyResponseBody.verification_info.token,
        returnSecureToken: true,
      },
    })
    const firebaseResponseBody = await firebaseResponse.json()
    console.log('firebaseResponseBody', firebaseResponseBody)

    expect(firebaseResponseBody.idToken).not.toBeNull()

    // Token Firebase before PIN code verify
    const tokenFirebaseResponse = await request.post(
      testEndpoint.VerifyTokenFirebase,
      {
        data: {
          grant_type: 'refresh_token',
          refresh_token: firebaseResponseBody.refreshToken,
        },
      }
    )

    const tokenFirebaseResponseBody = await tokenFirebaseResponse.json()
    console.log('tokenFirebaseResponseBody', tokenFirebaseResponseBody)

    expect(tokenFirebaseResponseBody.id_token).not.toBeNull()

    // Create PIN code
    const createPinResponse = await request.post(testEndpoint.createPinCode, {
      headers: {
        Authorization: `Bearer ${tokenFirebaseResponseBody.id_token}`,
        'x-app-version': '4.7.0',
      },
      data: {
        pincode: testData.pinCode,
      },
    })
    const createPinResponseBody = await createPinResponse.json()
    console.log('createPinResponseBody', createPinResponseBody)

    expect(createPinResponseBody.message).toBe('Create PIN successfully')

    //Token Firebase after PIN code verify
    const verifyPinTokenResponse = await request.post(
      testEndpoint.VerifyAfterTokenFirebase,
      {
        data: {
          grant_type: 'refresh_token',
          refresh_token: firebaseResponseBody.refreshToken,
        },
      }
    )

    const verifyPinTokenResponseBody = await verifyPinTokenResponse.json()
    console.log('verifyPinTokenResponseBody', verifyPinTokenResponseBody)

    expect(verifyPinTokenResponseBody.idToken).not.toBeNull()
    // get porfile
    const getProfileResponse = await request.get(testEndpoint.getProfile, {
      headers: {
        Authorization: `Bearer ${verifyPinTokenResponseBody.id_token}`,
        'x-app-version': '4.7.0',
      },
    })

    const getProfileResponseBody = await getProfileResponse.json()
    console.log('getProfileResponseBody', getProfileResponseBody)

    expect(getProfileResponseBody.profile.has_pin_code).not.toBeNull()
    expect(getProfileResponseBody.profile.phone).toBe(testData.phone)
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
