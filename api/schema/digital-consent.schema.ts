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
  national_id: z.union([z.string(), z.number()]),
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
    update_rows: z.array(z.any()),
    delete_rows: z.array(z.any()),
    create_num_row: z.number(),
    update_num_row: z.number(),
    delete_num_row: z.number(),
  }),
})

export const ImportSuccessSchema = z.object({
  message: z.string(),
})

// --- Consent signup schemas (steps 8–10) ---

export const ScreeningValidateSchema = z.object({}).passthrough()

export const ConsentRequestFormSchema = z.object({
  verification: z.object({
    ref_code: z.string(),
  }),
})

export const ConsentVerifyFormSchema = z.object({
  verification_info: z.object({
    token: z.string().regex(/^ey/),
    profile: z.any(),
    company: z.any(),
  }),
})
