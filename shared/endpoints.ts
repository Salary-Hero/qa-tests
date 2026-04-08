export const endpoints = {
  admin: {
    employees: '/api/v1/admin/employees',
    employee: (id: number) => `/api/v1/admin/employees/${id}`,
    signupCleanup: (phone: string) => `/api/v1/admin/signup/${phone}`,
  },
  signup: {
    requestOtp: '/api/v2/public/account/authen/signup/phone',
    verifyOtp: '/api/v2/public/account/authen/signup/verify-otp',
    submit: '/api/v2/public/account/authen/signup',
    setupPin: '/api/v2/public/account/authen/signup/pin',
  },
}
