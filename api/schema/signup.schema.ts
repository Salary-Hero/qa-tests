import { z } from 'zod'

/** Step 1: POST /api/v2/public/account/signup/phone */
export const OtpRequestSchema = z.object({
  is_signup: z.literal(false),
  next_state: z.literal('signup.phone.verify'),
  verification_info: z.object({
    ref_code: z.string(),
  }),
})

/** Step 2: POST /api/v2/public/account/signup/phone?action=verify */
export const OtpVerifySchema = z.object({
  is_signup: z.literal(true),
  next_state: z.literal('user.profile'),
  verification_info: z.object({
    token: z.string(),
    profile: z.object({
      user_id: z.string(),
      phone: z.string(),
      has_pincode: z.boolean(),
      signup_at: z.string().nullable(),
    }),
    company: z.object({
      id: z.number(),
      name: z.string(),
      status: z.string(),
    }),
  }),
})

/** Step 3: POST https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken */
export const FirebaseSignInSchema = z.object({
  kind: z.string(),
  idToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.string(),
  isNewUser: z.boolean(),
})

/** Steps 4 & 6: POST https://securetoken.googleapis.com/v1/token */
export const FirebaseRefreshSchema = z.object({
  id_token: z.string(),
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.string(),
})

/** Step 5: POST /api/v1/user/account/profile/pincode/create */
export const CreatePinSchema = z.object({
  message: z.string(),
})

/** Employee-ID Step 1: POST /api/v3/public/account/signup/employee-id */
export const EmployeeIdLookupSchema = z.object({
  is_signup: z.literal(false),
  verification_info: z.object({
    auth_challenge: z.string(),
  }),
})

/** Employee-ID Step 2: POST /api/v2/public/account/signup/employee-id/add-phone?action=request */
export const EmployeeIdOtpRequestSchema = z.object({
  verification: z.object({
    ref_code: z.string(),
  }),
})

/** Employee-ID Step 3: POST /api/v2/public/account/signup/employee-id/add-phone?action=verify */
export const EmployeeIdOtpVerifySchema = z.object({
  verification: z.object({
    token: z.string(),
    profile: z.object({
      user_id: z.string(),
      has_pincode: z.boolean(),
      signup_at: z.string().nullable(),
    }),
    company: z.object({
      id: z.number(),
      name: z.string(),
      status: z.string(),
    }),
  }),
})

/** LINE Step 1: POST /api/v2/public/account/signup/line */
export const LineSignupSchema = z.object({
  is_signup: z.literal(false),
  verification_info: z.object({
    auth_challenge: z.string(),
  }),
})

/** LINE Step 2: POST /api/v2/public/account/signup/line/add-phone?action=request */
export const LineOtpRequestSchema = z.object({
  verification: z.object({
    ref_code: z.string(),
  }),
})

/** LINE Step 3: POST /api/v2/public/account/signup/line/add-phone?action=verify */
export const LineOtpVerifySchema = z.object({
  verification: z.object({
    token: z.string(),
    profile: z.object({
      user_id: z.string(),
      line_id: z.string().nullable(),
      has_pincode: z.boolean(),
      signup_at: z.string().nullable(),
    }),
    company: z.object({
      id: z.number(),
      name: z.string(),
      status: z.string(),
    }),
  }),
})

/** LINE token refresh: POST https://api.line.me/oauth2/v2.1/token */
export const LineTokenRefreshSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  scope: z.string(),
})

/** Step 7: GET /api/v1/user/account/profile */
export const GetProfileSchema = z.object({
  company: z.object({
    name: z.string(),
    status: z.string(),
  }),
  profile: z.object({
    user_id: z.string(),
    phone: z.string(),
    has_pincode: z.boolean(),
    signup_at: z.string().nullable(),
    employee_type: z.string(),
  }),
  bank_account: z.object({
    bank_code: z.string(),
    account_verify: z.string(),
  }),
})
