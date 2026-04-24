import { APIRequestContext } from '@playwright/test'
import { z } from 'zod'
import { endpoints } from '../../shared/endpoints'
import { Company } from '../../shared/utils/seed-config'
import { resolvePhone, generateAccountNo } from './identifiers'
import { Identifiers } from './seed'
import { getAdminToken } from './admin-auth'

const CreateEmployeeResponseSchema = z.object({
  information: z.object({
    user_id: z.union([z.string(), z.number()]).transform(String),
  }),
})

const EmployeeRecordSchema = z.object({
  user_id: z.union([z.string(), z.number()]),
  company_id: z.union([z.string(), z.number()]),
  phone: z.string().optional(),
  email: z.string().optional(),
  employee_id: z.string().optional(),
  line_id: z.string().optional(),
})

const EmployeeSearchResponseSchema = z.object({
  data: z.array(EmployeeRecordSchema).optional(),
})

export type EmployeeRecord = z.infer<typeof EmployeeRecordSchema>

export type MatchField = 'phone' | 'line_id' | 'email' | 'employee_id'

export type CreateEmployeePayload = {
  information: {
    status: string
    img_url: null
    first_name: string
    middle_name: string
    last_name: string
    email: string
    phone: string
    company_id: string
    employee_id: string
    salary: number
    national_id: string
    birthday_at: string
    passport_no: string
    site_list: []
    paycycle_id: number
    is_blacklist: boolean
    disbursement_type: string
    line_id: string
    department_id: null
    site_ids: []
  }
  address: {
    sub_district: string
    district: string
    province: string
    postcode: string
    street_address: string
  }
  bank: {
    bank_code: string
    account_name: string
    account_no: string
  }
}

export function buildMonthlyEmployeePayload(opts: {
  company: Company
  identifiers: Identifiers
  nameSuffix?: string
}): CreateEmployeePayload {
  const { company, identifiers, nameSuffix = 'QA' } = opts

  return {
    information: {
      status: 'active',
      img_url: null,
      first_name: 'QA',
      middle_name: '',
      last_name: nameSuffix,
      email: identifiers.email ?? '',
      phone: identifiers.phone ?? resolvePhone(),
      company_id: String(company.id),
      employee_id: identifiers.employee_id ?? '',
      salary: 50000,
      national_id: identifiers.national_id ?? '',
      birthday_at: '1990-01-01T00:00:00.000Z',
      passport_no: identifiers.passport_no ?? '',
      site_list: [],
      paycycle_id: company.qa_paycycle_id,
      is_blacklist: false,
      disbursement_type: 'bank',
      line_id: identifiers.line_id ?? '',
      department_id: null,
      site_ids: [],
    },
    address: {
      sub_district: 'QA',
      district: 'QA',
      province: 'QA',
      postcode: '10000',
      street_address: 'QA Street',
    },
    bank: {
      bank_code: '014',
      account_name: '',
      account_no: generateAccountNo(),
    },
  }
}

export async function createEmployee(
  request: APIRequestContext,
  company: Company,
  payload: CreateEmployeePayload
): Promise<{ user_id: string }> {
  const token = await getAdminToken(request)
  const url = endpoints.admin.createEmployee(company.id)

  const response = await request.post(url, {
    data: payload,
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok()) {
    throw new Error(
      `createEmployee failed\n` +
        `  POST ${url}\n` +
        `  Status: ${response.status()}\n` +
        `  Response: ${await response.text()}`
    )
  }

  const body = CreateEmployeeResponseSchema.parse(await response.json())
  return { user_id: body.information.user_id }
}

export async function deleteEmployee(
  request: APIRequestContext,
  userId: string
): Promise<void> {
  if (!userId) return

  const token = await getAdminToken(request)
  const url = endpoints.admin.deleteEmployee(userId)

  const response = await request.delete(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok() && response.status() !== 404) {
    throw new Error(
      `deleteEmployee failed\n` +
        `  DELETE ${url}\n` +
        `  Status: ${response.status()}\n` +
        `  Response: ${await response.text()}`
    )
  }
}

export async function findEmployeeByIdentifier(
  request: APIRequestContext,
  company: Company,
  identifier: string,
  matchField: MatchField
): Promise<{ user_id: string } | null> {
  if (!identifier) return null

  const token = await getAdminToken(request)
  const url = endpoints.admin.searchEmployee

  const response = await request.get(url, {
    params: {
      page: '1',
      per_page: '10',
      is_show_deleted: '0',
      search: identifier,
    },
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok()) {
    throw new Error(
      `findEmployeeByIdentifier failed\n` +
        `  GET ${url}?search=${identifier}\n` +
        `  Status: ${response.status()}\n` +
        `  Response: ${await response.text()}`
    )
  }

  const body = await response.json()
  const parsed = EmployeeSearchResponseSchema.safeParse(body)
  if (!parsed.success) {
    throw new Error(
      `findEmployeeByIdentifier returned invalid response: ${parsed.error.message}`
    )
  }

  const records = parsed.data.data ?? []
  const match = records.find(
    (e) =>
      String(e[matchField]) === identifier &&
      String(e.company_id) === String(company.id)
  )

  return match ? { user_id: String(match.user_id) } : null
}
