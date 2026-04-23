import { APIRequestContext } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { endpoints } from '../../shared/endpoints'
import { validateSchema } from '../../shared/utils/schema'
import { ENV } from '../../shared/utils/env'
import { getCompany } from '../../shared/utils/seed-config'
import { baseURLs } from '../../playwright.config'
import {
  ImportJobSchema,
  ImportMappingSchema,
  ImportPreviewSchema,
  ImportSuccessSchema,
} from '../schema/digital-consent.schema'

const FIXTURE_PATH = path.resolve(__dirname, '../fixtures/digital-consent-import.xlsx')

const COMPANY_ID = getCompany('digital_consent').id

// Playwright's extraHTTPHeaders sets Content-Type: application/json globally.
// For multipart file uploads, this conflicts with the required multipart/form-data boundary.
// We use native fetch for Step 1 (file upload) to bypass this limitation.
// baseURLs is sourced from playwright.config.ts — the single source of truth for API hosts.
const apiHost = baseURLs[ENV] ?? baseURLs.dev

/**
 * Runs the full 7-step Digital Consent import pipeline.
 * Uploads the Excel fixture and returns the job_id on completion.
 */
export async function importDigitalConsentData(
  request: APIRequestContext,
  adminToken: string
): Promise<string> {
  const authHeaders = { Authorization: `Bearer ${adminToken}` }

  // Step 1: Create import job — returns job_id used in all subsequent steps
  // Uses native fetch + FormData to avoid the global Content-Type: application/json
  // header (set in playwright.config extraHTTPHeaders) overriding the multipart boundary.
  const fileBuffer = fs.readFileSync(FIXTURE_PATH)
  const formData = new FormData()
  formData.append('company_id', String(COMPANY_ID))
  formData.append('is_include_child_company', 'false')
  formData.append(
    'file',
    new Blob([fileBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    'digital-consent-import.xlsx'
  )

  const createFetchResponse = await fetch(`${apiHost}${endpoints.consent.importCreateJob}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: formData,
  })
  if (!createFetchResponse.ok) {
    throw new Error(`Step 1 Create Job failed: ${createFetchResponse.status} ${await createFetchResponse.text()}`)
  }
  const createBody = await createFetchResponse.json() as { job_id: string }
  validateSchema(createBody, ImportJobSchema, 'Create Job')
  const jobId: string = createBody.job_id

  // Step 2: Configure import
  const configResponse = await request.put(endpoints.consent.importUpdateJob(jobId), {
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    data: {
      config: {
        create_action: true,
        update_action: false,
        delete_action: false,
        identifier: 'employee_id',
        update_columns: ['national_id', 'passport_no'],
        include_company_ids: [],
      },
    },
  })
  if (!configResponse.ok()) {
    throw new Error(`Step 2 Update Config failed: ${configResponse.status()} ${await configResponse.text()}`)
  }
  validateSchema(await configResponse.json(), ImportJobSchema, 'Update Config')

  // Step 3: Map Excel column headers to API fields
  const mappingResponse = await request.put(endpoints.consent.importMapping(COMPANY_ID), {
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    data: {
      data: {
        employee_id: 'Employee ID',
        national_id: 'National ID',
        passport_no: 'Passport No',
      },
      update_columns: [],
      company_column_name: null,
      company_mapping: {},
    },
  })
  if (!mappingResponse.ok()) {
    throw new Error(`Step 3 Mapping Column failed: ${mappingResponse.status()} ${await mappingResponse.text()}`)
  }
  validateSchema(await mappingResponse.json(), ImportMappingSchema, 'Mapping Column')

  // Step 4: Re-confirm config after mapping
  const reConfigResponse = await request.put(endpoints.consent.importUpdateJob(jobId), {
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    data: {
      config: {
        create_action: true,
        update_action: false,
        delete_action: false,
        identifier: 'employee_id',
        update_columns: [],
        include_company_ids: [],
      },
    },
  })
  if (!reConfigResponse.ok()) {
    throw new Error(`Step 4 Update Config After Mapping failed: ${reConfigResponse.status()} ${await reConfigResponse.text()}`)
  }
  validateSchema(await reConfigResponse.json(), ImportJobSchema, 'Update Config After Mapping')

  // Brief wait to allow the server to finish processing Steps 1-4 before preview
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // Step 5: Generate preview
  const previewResponse = await request.post(endpoints.consent.importPreview(jobId), {
    headers: authHeaders,
  })
  if (!previewResponse.ok()) {
    throw new Error(`Step 5 Create Preview failed: ${previewResponse.status()} ${await previewResponse.text()}`)
  }
  const previewBody = await previewResponse.json()
  validateSchema(previewBody, ImportPreviewSchema, 'Create Preview')
  if (previewBody.preview.create_num_row === 0) {
    throw new Error(`Step 5 Create Preview: 0 rows found. File may not have been properly uploaded.`)
  }

  // Brief wait to allow preview processing to settle before validate
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Step 6: Validate
  const validateResponse = await request.post(endpoints.consent.importValidate(jobId), {
    headers: authHeaders,
  })
  if (!validateResponse.ok()) {
    throw new Error(`Step 6 Validate failed: ${validateResponse.status()} ${await validateResponse.text()}`)
  }
  validateSchema(await validateResponse.json(), ImportSuccessSchema, 'Validate')

  // Step 7: Confirm import
  const importResponse = await request.post(endpoints.consent.importConfirm(jobId), {
    headers: authHeaders,
  })
  if (!importResponse.ok()) {
    throw new Error(`Step 7 Confirm Import failed: ${importResponse.status()} ${await importResponse.text()}`)
  }
  validateSchema(await importResponse.json(), ImportSuccessSchema, 'Confirm Import')

  return jobId
}
