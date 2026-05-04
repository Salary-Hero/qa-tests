import { APIRequestContext } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { endpoints } from '../../shared/endpoints'
import { parseResponse } from '../../shared/utils/response'
import { getCompany } from '../../shared/utils/seed-config'
import { getApiBaseUrl } from '../../shared/utils/env'
import {
  ImportJobSchema,
  ImportMappingSchema,
  ImportPreviewSchema,
  ImportSuccessSchema,
} from '../schema/digital-consent.schema'

const FIXTURE_PATH = path.resolve(__dirname, '../fixtures/digital-consent-import.xlsx')

const COMPANY_ID = getCompany('digital_consent').id

/**
 * Posts to `url` and returns the response. Retries with 500ms backoff if the
 * server responds with a non-2xx — the import pipeline processes steps
 * asynchronously, so the next step may not be ready immediately.
 * Throws after `maxAttempts` with the final status code and response body so
 * the test fails immediately with a clear message rather than passing a failing
 * response to parseResponse.
 */
async function retryPost(
  request: APIRequestContext,
  url: string,
  headers: Record<string, string>,
  maxAttempts = 8,
  backoffMs = 500
): ReturnType<APIRequestContext['post']> {
  let last: Awaited<ReturnType<APIRequestContext['post']>>
  for (let i = 0; i < maxAttempts; i++) {
    last = await request.post(url, { headers })
    if (last.ok()) return last
    await new Promise((resolve) => setTimeout(resolve, backoffMs))
  }
  const body = await last!.text().catch(() => '<unreadable>')
  throw new Error(
    `retryPost exhausted ${maxAttempts} attempts for ${url}\n` +
    `  Last status: ${last!.status()}\n` +
    `  Body: ${body}`
  )
}

/**
 * Runs the full 7-step Digital Consent import pipeline.
 * Uploads the Excel fixture and returns the job_id on completion.
 *
 * Step 1 uses native fetch instead of Playwright's request context because
 * playwright.config extraHTTPHeaders sets Content-Type: application/json globally,
 * which conflicts with the multipart/form-data boundary required for file upload.
 * getApiBaseUrl() is used only here — all other steps use relative paths via request.
 */
export async function importDigitalConsentData(
  request: APIRequestContext,
  adminToken: string
): Promise<string> {
  const apiHost = getApiBaseUrl()
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
  const createBody = ImportJobSchema.parse(await createFetchResponse.json())
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
  await parseResponse(configResponse, ImportJobSchema, 'Step 2 Update Config')

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
  await parseResponse(mappingResponse, ImportMappingSchema, 'Step 3 Mapping Column')

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
  await parseResponse(reConfigResponse, ImportJobSchema, 'Step 4 Update Config After Mapping')

  // Step 5: Generate preview — retries until the server finishes processing Steps 1–4
  const previewResponse = await retryPost(request, endpoints.consent.importPreview(jobId), authHeaders)
  const previewBody = await parseResponse(previewResponse, ImportPreviewSchema, 'Step 5 Create Preview')
  if (previewBody.preview.create_num_row === 0) {
    throw new Error(`Step 5 Create Preview: 0 rows found. File may not have been properly uploaded.`)
  }

  // Step 6: Validate — retries until preview processing settles
  const validateResponse = await retryPost(request, endpoints.consent.importValidate(jobId), authHeaders)
  await parseResponse(validateResponse, ImportSuccessSchema, 'Step 6 Validate')

  // Step 7: Confirm import — retries until validation processing settles
  const importResponse = await retryPost(request, endpoints.consent.importConfirm(jobId), authHeaders)
  await parseResponse(importResponse, ImportSuccessSchema, 'Step 7 Confirm Import')

  return jobId
}
