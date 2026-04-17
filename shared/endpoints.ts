export const endpoints = {
  admin: {
    login: '/api/v1/public/account/admin/login',
    createEmployee: (companyId: number) =>
      `/api/v1/admin/account/employee/${companyId}`,
    deleteEmployee: (userId: string) =>
      `/api/v1/admin/account/employee/${userId}`,
    searchEmployee: '/api/v2/admin/account/employee',
  },
  signup: {
    requestOtp: '/api/v2/public/account/signup/phone',
    verifyOtp: '/api/v2/public/account/signup/phone', // + ?action=verify query param
    createPin: '/api/v1/user/account/profile/pincode/create',
    getProfile: '/api/v1/user/account/profile',
    logout: '/api/v1/user/account/profile/logout',
    employeeIdLookup: '/api/v3/public/account/signup/employee-id',
    employeeIdAddPhone: '/api/v2/public/account/signup/employee-id/add-phone',
  },
  firebase: {
    signInWithCustomToken:
      'https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken',
    refreshToken: 'https://securetoken.googleapis.com/v1/token',
  },
}
