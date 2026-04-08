import { expect } from '@playwright/test'
import { ZodSchema } from 'zod'

export function validateSchema<T>(
  data: unknown,
  schema: ZodSchema<T>,
  label = 'Schema'
) {
  const result = schema.safeParse(data)
  if (!result.success) {
    console.error(`${label} errors:`, result.error.format())
  }
  expect(result.success, `${label} validation failed`).toBe(true)
}
