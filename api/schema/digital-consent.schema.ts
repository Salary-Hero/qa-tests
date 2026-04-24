import { z } from 'zod'

// --- Import pipeline schemas (steps 1–7) ---

export const ImportJobConfigSchema = z.object({
  create_action: z.boolean(),
  update_action: z.boolean(),
  delete_action: z.boolean(),
  identifier: z.string(),
  update_columns: z.array(z.string()),
})

export const ImportJobSchema = z.object({
  job_id: z.string(),
  company_id: z.number(),
  status: z.string(),
  import_type: z.string().optional(),
  config: ImportJobConfigSchema,
})

export const ImportMappingSchema = z.object({
  id: z.string(),
  company_id: z.number(),
  mapping: z.record(z.string(), z.string()),
  update_columns: z.array(z.string()),
})

const PreviewRowSchema = z.object({
  employee_id: z.string(),
  // API inconsistently returns national_id as string or number — normalise to string
  national_id: z.union([z.string(), z.number()]).transform(String),
  passport_no: z.string(),
  company_id: z.number(),
})

export const ImportPreviewSchema = z.object({
  job_id: z.string(),
  company_id: z.number(),
  status: z.string(),
  config: ImportJobConfigSchema,
  preview: z.object({
    create_rows: z.array(PreviewRowSchema),
    update_rows: z.array(z.unknown()),
    delete_rows: z.array(z.unknown()),
    create_num_row: z.number(),
    update_num_row: z.number(),
    delete_num_row: z.number(),
  }),
})

export const ImportSuccessSchema = z.object({
  message: z.string(),
})

// --- Consent signup schemas (steps 8–10) ---

// TODO: define full schema once the response contract is confirmed.
// passthrough() is a temporary placeholder — replace with explicit field definitions.
export const ScreeningValidateSchema = z.object({}).passthrough()

export const ConsentRequestFormSchema = z.object({
  verification: z.object({
    ref_code: z.string(),
  }),
})

export const ConsentVerifyFormSchema = z.object({
  verification_info: z.object({
    token: z.string().regex(/^ey/),
    profile: z.object({
      user_id: z.string(),
      has_pincode: z.boolean(),
      signup_at: z.string().nullable().optional(),
    }),
    company: z.object({
      id: z.number(),
      name: z.string(),
      status: z.string(),
    }),
  }),
})
