/**
 * Approval import pipeline helper for the standard Digital Consent company
 * (employee_id + national_id/passport_no pre-loaded from screening fixture).
 *
 * Runs the 7-step approval import (steps 15–21) using /v3/admin/account/employee-import/.
 *
 * Key difference from the Employee ID Only approval helper:
 * - national_id/passport_no are pre-loaded from the screening fixture and are
 *   already correct in the static approval xlsx. They can optionally be overridden
 *   per-row (e.g. when a test submits a different identity value at signup time).
 * - `phone` and `account_no` must always be passed as row overrides to match the
 *   consent request form submission and avoid bank uniqueness collisions.
 *
 * Step 15 uses native fetch (not Playwright request context) because
 * playwright.config extraHTTPHeaders sets Content-Type: application/json globally,
 * which conflicts with the multipart/form-data boundary required for file upload.
 */
import { APIRequestContext } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import ExcelJS from 'exceljs'
import { endpoints } from '../../shared/endpoints'
import { parseResponse } from '../../shared/utils/response'
import { getCompany } from '../../shared/utils/seed-config'
import { getApiBaseUrl } from '../../shared/utils/env'
import { generateAccountNo } from './identifiers'
import {
  ApprovalImportJobSchema,
  ApprovalImportPreviewSchema,
  ImportSuccessSchema,
  ImportMappingSchema,
  ApprovalRowOverride,
} from '../schema/digital-consent.schema'

export type { ApprovalRowOverride }

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

const FIXTURE_PATH = path.resolve(__dirname, '../fixtures/digital-consent-import-approval.xlsx')

const COMPANY = getCompany('digital_consent')

/**
 * Runs the full 7-step approval import pipeline for the standard Digital Consent
 * company (steps 15–21 in the Postman collection).
 *
 * Uses /v3/admin/account/employee-import/ endpoints with approve_action: true.
 *
 * When `rowOverrides` is provided, the xlsx is built in-memory so that
 * dynamic per-run values (phone, account_no) are written into the file.
 * If no overrides are given, the static fixture at FIXTURE_PATH is used as-is.
 */
export async function importDigitalConsentApprovalData(
  request: APIRequestContext,
  adminToken: string,
  rowOverrides?: ApprovalRowOverride[]
): Promise<string> {
  const apiHost = getApiBaseUrl()
  const authHeaders = { Authorization: `Bearer ${adminToken}` }

  // Step 15: Create approval import job
  const fileBuffer = rowOverrides && rowOverrides.length > 0
    ? await buildApprovalXlsx(rowOverrides)
    : fs.readFileSync(FIXTURE_PATH)

  const formData = new FormData()
  formData.append('company_id', String(COMPANY.id))
  formData.append('is_include_child_company', 'false')
  formData.append('all_pay_cycle_ids', 'true')
  formData.append('pay_cycle_ids[0]', 'null')
  formData.append('pay_cycle_ids[1]', String(COMPANY.qa_paycycle_id))
  formData.append(
    'file',
    new Blob([fileBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    'digital-consent-import-approval.xlsx'
  )

  const createFetchResponse = await fetch(`${apiHost}${endpoints.consent.approvalImportCreateJob}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: formData,
  })
  if (!createFetchResponse.ok) {
    throw new Error(
      `Step 15 Create Approval Job failed: ${createFetchResponse.status} ${await createFetchResponse.text()}`
    )
  }
  const createBody = ApprovalImportJobSchema.parse(await createFetchResponse.json())
  const jobId: string = createBody.job_id

  // Step 16: Configure approval import — approve_action: true, create_action: false
  const configResponse = await request.put(endpoints.consent.approvalImportUpdateJob(jobId), {
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    data: {
      config: {
        approve_action: true,
        create_action: false,
        update_action: false,
        delete_action: false,
        identifier: 'employee_id',
        date_format: 'DD/MM/YYYY',
        hired_date_format: 'DD/MM/YYYY',
        update_columns: [],
        is_include_child_company: false,
        include_company_ids: [],
      },
    },
  })
  await parseResponse(configResponse, ApprovalImportJobSchema, 'Step 16 Update Config - Approval')

  // Step 17: Map Excel column headers to API fields — full employee data
  const mappingResponse = await request.put(endpoints.consent.approvalImportMapping(COMPANY.id), {
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    data: {
      data: {
        employee_id: 'Employee ID',
        disbursement_type: 'Disbursement Type',
        bank_alias: 'Bank Name',
        account_no: 'Bank Account Number',
        account_name: 'Bank Account Name',
        promptpay_type: null,
        promptpay_id: null,
        first_name: 'First Name',
        middle_name: 'Middle Name',
        last_name: 'Last Name',
        phone: 'Mobile',
        salary_type: 'Salary Type',
        salary: 'Salary',
        hired_date: null,
        paycycle_code: 'Pay Cycle Code',
        paycycle_name: 'Pay Cycle Name',
        email: 'Email',
        national_id: 'National ID',
        passport_no: 'Passport No',
        status: 'Status',
        is_blacklist: null,
        birthday_at: 'Date Of Birth',
        street_address: 'Detail Address',
        district: 'District',
        sub_district: 'Sub District',
        province: 'Province',
        postcode: 'Postcode',
        department: 'Department',
        line_id: 'Line ID',
        company_site: 'Company Site',
        deduction_type: 'Deduction Type',
        deduction: 'Deduction',
      },
      update_columns: [],
      company_column_name: null,
      company_mapping: {},
    },
  })
  await parseResponse(mappingResponse, ImportMappingSchema, 'Step 17 Mapping Column - Approval')

  // Step 18: Re-confirm config after mapping
  const reConfigResponse = await request.put(endpoints.consent.approvalImportUpdateJob(jobId), {
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    data: {
      config: {
        approve_action: true,
        create_action: false,
        update_action: false,
        delete_action: false,
        identifier: 'employee_id',
        date_format: 'DD/MM/YYYY',
        hired_date_format: 'DD/MM/YYYY',
        update_columns: [],
        is_include_child_company: false,
        include_company_ids: [],
      },
    },
  })
  await parseResponse(reConfigResponse, ApprovalImportJobSchema, 'Step 18 Update Config After Mapping - Approval')

  // Step 19: Generate approval preview — retries until the server finishes processing Step 18
  const previewResponse = await retryPost(request, endpoints.consent.approvalImportPreview(jobId), authHeaders)
  const previewBody = await parseResponse(previewResponse, ApprovalImportPreviewSchema, 'Step 19 Approval Preview')
  if (previewBody.preview.approve_num_row === 0) {
    throw new Error(
      `Step 19 Approval Preview: 0 rows eligible for approval. ` +
      `Possible causes: employee consent_status is not 'pending_review', ` +
      `phone/identity mismatch with submitted consent form, ` +
      `or duplicate bank account_no in the system.`
    )
  }

  // Step 20: Validate — retries until preview processing settles
  const validateResponse = await retryPost(request, endpoints.consent.approvalImportValidate(jobId), authHeaders)
  await parseResponse(validateResponse, ImportSuccessSchema, 'Step 20 Validate - Approval')

  // Step 21: Confirm approval import — retries until validation processing settles
  const importResponse = await retryPost(request, endpoints.consent.approvalImportConfirm(jobId), authHeaders)
  await parseResponse(importResponse, ImportSuccessSchema, 'Step 21 Confirm Import - Approval')

  // The confirm step triggers a background worker that updates employee_profile.consent_status.
  // The caller is responsible for polling until the expected status is reached.
  return jobId
}

/**
 * Builds an approval xlsx in-memory from the static fixture, applying per-row
 * overrides for phone and account_no (and optionally national_id/passport_no).
 *
 * All fixture rows are preserved — only the rows matching an override have their
 * dynamic fields updated. Keeping all rows is required because the API scopes the
 * import by pay cycle: employees in the pay cycle but absent from the xlsx are
 * flagged in delete_rows, which can cause the approval worker to silently abort
 * even when delete_action is false.
 *
 * For the standard consent company, national_id/passport_no are pre-loaded from
 * the screening fixture and are already correct in the static xlsx — only phone
 * and account_no need to be overridden per test run to match the consent form
 * submission and avoid bank uniqueness collisions.
 */
async function buildApprovalXlsx(overrides: ApprovalRowOverride[]): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(FIXTURE_PATH)
  const ws = wb.worksheets[0]

  const headerRow = ws.getRow(1)
  const colIndex: Record<string, number> = {}
  headerRow.eachCell((cell, colNumber) => {
    if (typeof cell.value === 'string') {
      colIndex[cell.value] = colNumber
    }
  })

  const overrideMap = new Map(overrides.map((o) => [o.employee_id, o]))

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return

    // Normalise national_id to string — fixture stores it as a number, but the
    // approval worker does a string comparison against the consent form submission.
    if (colIndex['National ID']) {
      const cell = row.getCell(colIndex['National ID'])
      if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
        cell.value = String(cell.value)
      }
    }

    const employeeId = String(row.getCell(colIndex['Employee ID']).value ?? '')
    const override = overrideMap.get(employeeId)
    if (!override) {
      // Generate a fresh account_no for rows without an explicit override — the static
      // fixture values may already exist in user_bank from a previous test run, causing
      // the approval worker to fail the entire batch due to a uniqueness collision.
      row.getCell(colIndex['Bank Account Number']).value = generateAccountNo()
      row.commit()
      return
    }

    row.getCell(colIndex['Mobile']).value = override.phone
    row.getCell(colIndex['Bank Account Number']).value = override.account_no

    if (override.national_id !== undefined) {
      row.getCell(colIndex['National ID']).value = override.national_id
    }
    if (override.passport_no !== undefined) {
      row.getCell(colIndex['Passport No']).value = override.passport_no
    }

    row.commit()
  })

  const buffer = await wb.xlsx.writeBuffer()
  return buffer as ArrayBuffer
}
