import { APIRequestContext } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { endpoints } from '../../shared/endpoints'
import { validateSchema } from '../../shared/utils/schema'
import { getCompany } from '../../shared/utils/seed-config'
import { getApiBaseUrl } from '../../shared/utils/env'
import {
  ImportJobSchema,
  ImportMappingSchema,
  ImportPreviewSchema,
  ImportSuccessSchema,
} from '../schema/digital-consent.schema'

const FIXTURE_PATH = path.resolve(__dirname, '../fixtures/digital-consent-employee-id-import.xlsx')

const COMPANY_ID = getCompany('digital_consent_employee_id').id

/**
 * Runs the full 7-step Digital Consent import pipeline for the
 * "Employee ID only" company — the import file contains only employee_id,
 * no national_id or passport_no columns.
 *
 * Step 1 uses native fetch instead of Playwright's request context because
 * playwright.config extraHTTPHeaders sets Content-Type: application/json globally,
 * which conflicts with the multipart/form-data boundary required for file upload.
 */
export async function importDigitalConsentEmployeeIdData(
  request: APIRequestContext,
  adminToken: string
): Promise<string> {
  const apiHost = getApiBaseUrl()
  const authHeaders = { Authorization: `Bearer ${adminToken}` }

  // Step 1: Create import job
  const fileBuffer = fs.readFileSync(FIXTURE_PATH)
  const formData = new FormData()
  formData.append('company_id', String(COMPANY_ID))
  formData.append('is_include_child_company', 'false')
  formData.append(
    'file',
    new Blob([fileBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    'digital-consent-employee-id-import.xlsx'
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

  // Step 2: Configure import — employee_id only, no identity columns
  const configResponse = await request.put(endpoints.consent.importUpdateJob(jobId), {
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
  if (!configResponse.ok()) {
    throw new Error(`Step 2 Update Config failed: ${configResponse.status()} ${await configResponse.text()}`)
  }
  validateSchema(await configResponse.json(), ImportJobSchema, 'Update Config')

  // Step 3: Map Excel column — employee_id only (no national_id or passport_no)
  const mappingResponse = await request.put(endpoints.consent.importMapping(COMPANY_ID), {
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    data: {
      data: {
        employee_id: 'Employee ID',
        national_id: null,
        passport_no: null,
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
    throw new Error(
      `Step 5 Create Preview: 0 rows eligible for creation. ` +
      `employee_profile rows for these employee IDs may already exist with a non-'new' consent_status from a previous run. ` +
      `Ensure beforeAll cleanup (cleanupConsentEidSignedUpUsers + deleteEmployeeProfileRecords) ran successfully before the import.`
    )
  }

  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Step 6: Validate
  const validateResponse = await request.post(endpoints.consent.importValidate(jobId), {
    headers: authHeaders,
  })
  if (!validateResponse.ok()) {
    throw new Error(`Step 6 Validate failed: ${validateResponse.status()} ${await validateResponse.text()}`)
  }
  validateSchema(await validateResponse.json(), ImportSuccessSchema, 'Validate')

  await new Promise((resolve) => setTimeout(resolve, 1000))

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
