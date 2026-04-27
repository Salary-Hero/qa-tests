import { z } from 'zod'

// --- Import pipeline schemas (steps 1–7) ---

export const ImportJobConfigSchema = z.object({
  create_action: z.boolean(),
  update_action: z.boolean(),
  delete_action: z.boolean(),
  identifier: z.string(),
  update_columns: z.array(z.string()),
  include_company_ids: z.array(z.number()).optional(),
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
  // Mapping values may be null when a column exists in the template but was
  // not mapped (e.g. employee-ID-only import has no national_id/passport_no)
  mapping: z.record(z.string(), z.string().nullable()),
  update_columns: z.array(z.string()),
})

const PreviewRowSchema = z.object({
  employee_id: z.string(),
  // national_id and passport_no are absent when the import file has employee_id only
  // API also inconsistently returns national_id as string or number — normalise to string
  national_id: z.union([z.string(), z.number()]).transform(String).optional(),
  passport_no: z.string().optional(),
  // company_id may be returned as string or number depending on import type
  company_id: z.union([z.string(), z.number()]).optional(),
}).passthrough()

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

// TODO: define explicit fields once the screening-validate response contract is confirmed.
// passthrough() is a temporary placeholder — it accepts any shape and validates nothing.
// Until this is replaced, the parseResponse() call in digital-consent.test.ts only
// asserts HTTP 200; it does not validate the response body structure.
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
