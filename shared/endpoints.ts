export const endpoints = {
  admin: {
    login: '/api/v1/public/account/admin/login',
    createEmployee: (companyId: number) =>
      `/api/v1/admin/account/employee/${companyId}`,
    deleteEmployee: (userId: string) =>
      `/api/v1/admin/account/employee/${userId}`,
    searchEmployee: '/api/v2/admin/account/employee',
  },
  consent: {
    // Admin: 7-step import pipeline
    importCreateJob: '/api/v1/admin/account/screening-import/jobs',
    importUpdateJob: (jobId: string) =>
      `/api/v1/admin/account/screening-import/jobs/${jobId}`,
    importMapping: (companyId: number) =>
      `/api/v1/admin/account/screening-import/${companyId}/mapping`,
    importPreview: (jobId: string) =>
      `/api/v1/admin/account/screening-import/jobs/${jobId}/preview`,
    importValidate: (jobId: string) =>
      `/api/v1/admin/account/screening-import/jobs/${jobId}/validate`,
    importConfirm: (jobId: string) =>
      `/api/v1/admin/account/screening-import/jobs/${jobId}/import`,

    // Public: consent-specific signup (steps 8–10)
    screeningValidate: '/api/v2/public/account/consent/screening/validate',
    requestForm: '/api/v2/public/account/consent/request-form/request',
    verifyForm: '/api/v1/public/account/consent/request-form/verify',
  },
  signup: {
    requestOtp: '/api/v2/public/account/signup/phone',
    verifyOtp: '/api/v2/public/account/signup/phone', // + ?action=verify query param
    createPin: '/api/v1/user/account/profile/pincode/create',
    getProfile: '/api/v1/user/account/profile',
    logout: '/api/v1/user/account/profile/logout',
    employeeIdLookup: '/api/v3/public/account/signup/employee-id',
    employeeIdAddPhone: '/api/v2/public/account/signup/employee-id/add-phone',
    lineSignup: '/api/v2/public/account/signup/line',
    lineAddPhone: '/api/v2/public/account/signup/line/add-phone',
  },
  line: {
    refreshToken: 'https://api.line.me/oauth2/v2.1/token',
  },
  firebase: {
    signInWithCustomToken:
      'https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken',
    refreshToken: 'https://securetoken.googleapis.com/v1/token',
  },
}
