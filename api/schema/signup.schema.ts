import { z } from 'zod'

export const OtpRequestSchema = z.object({
  verification_info: z.object({
    ref_code: z.string(),
  }),
})

export const OtpVerifySchema = z.object({
  message: z.string(),
})

export const SignupSchema = z.object({
  data: z.object({
    id: z.number(),
    phone: z.string(),
  }),
  error_code: z.string(),
  message: z.string(),
})

export const PinSetupSchema = z.object({
  data: z.object({
    status: z.string(),
  }),
  error_code: z.string(),
  message: z.string(),
})
