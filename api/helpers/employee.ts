import { APIRequestContext } from '@playwright/test'
import { endpoints } from '../../shared/endpoints'
import { Company } from '../../shared/utils/seed-config'
import { Identifiers } from './seed'
import { getAdminToken } from './admin-auth'

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

function generateUniquePhone(): string {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 100)}`.slice(-8)
  return `08${suffix}`
}

function generateUniqueAccountNo(): string {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-9)
  return `1${suffix}`
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
      phone: identifiers.phone ?? generateUniquePhone(),
      company_id: String(company.id),
      employee_id:
        identifiers.employee_id ??
        `EMP${Date.now()}${Math.floor(Math.random() * 100)}`,
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
      account_no: generateUniqueAccountNo(),
    },
  }
}

export async function createEmployee(
  request: APIRequestContext,
  company: Company,
  payload: CreateEmployeePayload
): Promise<{ user_id: string }> {
  const token = await getAdminToken(request)

  const response = await request.post(
    endpoints.admin.createEmployee(company.id),
    {
      data: payload,
      headers: { Authorization: `Bearer ${token}` },
    }
  )

  if (!response.ok()) {
    throw new Error(
      `createEmployee failed: ${response.status()} ${await response.text()}`
    )
  }

  const body = await response.json()
  return { user_id: body.information.user_id }
}

export async function deleteEmployee(
  request: APIRequestContext,
  userId: string
): Promise<void> {
  if (!userId) return

  const token = await getAdminToken(request)

  const response = await request.delete(
    endpoints.admin.deleteEmployee(userId),
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  )

  if (!response.ok() && response.status() !== 404) {
    throw new Error(
      `deleteEmployee failed: ${response.status()} ${await response.text()}`
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

  const response = await request.get(endpoints.admin.searchEmployee, {
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
      `findEmployeeByIdentifier failed: ${response.status()} ${await response.text()}`
    )
  }

  const body = await response.json()
  const match = (body.data ?? []).find(
    (e: Record<string, unknown>) =>
      e[matchField] === identifier &&
      String(e.company_id) === String(company.id)
  )

  return match ? { user_id: String(match.user_id) } : null
}
