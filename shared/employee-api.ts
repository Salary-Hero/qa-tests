import { APIRequestContext } from '@playwright/test';
import { apiPost, apiPatch, apiDelete } from './api-client';
import { getCompany } from './utils/seed-config';
import { generateAccountNo, generatePhone, generateEmployeeId } from '../api/helpers/identifiers';

export interface EmployeeInformation {
  first_name: string;
  middle_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  national_id?: string;
  passport_no?: string;
  birthday_at?: string;
  img_url?: string | null;
  status?: string;
  is_blacklist?: boolean;
  salary?: number;
  salary_type?: string;
  employee_id?: string;
  company_id?: string;
  department_id?: string | null;
  paycycle_id?: number;
  disbursement_type?: string;
  line_id?: string | null;
  site_ids?: string[];
  street_address?: string;
  sub_district?: string;
  district?: string;
  province?: string;
  postcode?: string;
}

export interface EmployeeAddress {
  street_address?: string;
  sub_district?: string;
  district?: string;
  province?: string;
  postcode?: string;
}

export interface EmployeeBank {
  bank_code?: string;
  account_name?: string;
  account_no?: string;
}

export interface EmployeePayload {
  information: EmployeeInformation;
  address?: EmployeeAddress;
  bank?: EmployeeBank;
}

export interface EmployeeResponse {
  information: EmployeeInformation & {
    user_id: number;
    created_at: string;
    updated_at: string;
  };
  address?: EmployeeAddress & {
    user_address_id: string;
    created_at: string;
    updated_at: string;
  };
  bank?: EmployeeBank & {
    user_bank_id: string;
    user_id: number;
    account_verify: string;
    created_at: string;
    updated_at: string;
  };
}

export async function createEmployeeViaAPI(
  request: APIRequestContext,
  token: string,
  data: EmployeePayload,
  companyId: number = getCompany('phone').id
): Promise<EmployeeResponse> {
  const response = await apiPost<EmployeeResponse>(
    request,
    `/v1/admin/account/employee/${companyId}`,
    token,
    data
  );

  if (!response.ok || !response.body.information.user_id) {
    throw new Error(`Failed to create employee: ${response.status} - ${JSON.stringify(response.body)}`);
  }

  return response.body;
}

export async function updateEmployeeViaAPI(
  request: APIRequestContext,
  token: string,
  userId: number,
  data: Partial<EmployeePayload>,
  companyId: number = getCompany('phone').id
): Promise<EmployeeResponse> {
  const response = await apiPatch<EmployeeResponse>(
    request,
    `/v1/admin/account/employee/${companyId}/${userId}`,
    token,
    data
  );

  if (!response.ok) {
    throw new Error(`Failed to update employee: ${response.status} - ${JSON.stringify(response.body)}`);
  }

  return response.body;
}

export async function deleteEmployeeViaAPI(
  request: APIRequestContext,
  token: string,
  userId: number
): Promise<void> {
  const response = await apiDelete(
    request,
    `/v1/admin/account/employee/${userId}`,
    token
  );

  if (!response.ok) {
    throw new Error(`Failed to delete employee: ${response.status} - ${JSON.stringify(response.body)}`);
  }
}

/**
 * Builds a PATCH payload from the employee's current data merged with updates.
 * Strips read-only fields (user_id, created_at, updated_at) — sending them
 * back causes 403 Permission Denied.
 */
export function buildUpdatePayload(
  originalEmployee: EmployeeInformation,
  updates: Partial<EmployeeInformation> = {}
): EmployeePayload {
  const writableFields: (keyof EmployeeInformation)[] = [
    'first_name',
    'middle_name',
    'last_name',
    'email',
    'phone',
    'national_id',
    'passport_no',
    'birthday_at',
    'salary',
    'salary_type',
    'employee_id',
    'company_id',
    'paycycle_id',
    'disbursement_type',
    'status',
    'is_blacklist',
  ];

  const mergedInformation: Partial<EmployeeInformation> = {};

  writableFields.forEach((field) => {
    let value = updates[field] !== undefined ? updates[field] : originalEmployee[field];
    if (value !== undefined) {
      // API returns paycycle_id as string but PATCH expects number
      if (field === 'paycycle_id' && value !== null) {
        value = Number(value);
      }
      (mergedInformation as Record<string, unknown>)[field] = value;
    }
  });

  return {
    information: mergedInformation as EmployeeInformation,
    address: {
      street_address: originalEmployee.street_address || '',
      sub_district: originalEmployee.sub_district || '',
      district: originalEmployee.district || '',
      province: originalEmployee.province || '',
      postcode: originalEmployee.postcode || '',
    },
    bank: {
      bank_code: '014',
      account_name: 'QA Test Account',
      account_no: generateAccountNo(),
    },
  };
}

export function buildEmployeePayload(
  firstName: string,
  options?: Partial<EmployeePayload>
): EmployeePayload {
  // API returns paycycle_id as string but expects number on write
  const paycycleId = options?.information?.paycycle_id
    ? Number(options.information.paycycle_id)
    : 3661;
  const salary = options?.information?.salary
    ? Number(options.information.salary)
    : 30000;
  const companyId = String(options?.information?.company_id || getCompany('phone').id);

  const defaultPayload: EmployeePayload = {
    information: {
      first_name: firstName,
      last_name: options?.information?.last_name || 'QA Test',
      email: options?.information?.email || '',
      phone: options?.information?.phone || generatePhone(),
      status: options?.information?.status || 'active',
      is_blacklist: options?.information?.is_blacklist ?? false,
      salary,
      salary_type: options?.information?.salary_type || 'monthly',
      employee_id: options?.information?.employee_id || generateEmployeeId(),
      company_id: companyId,
      department_id: options?.information?.department_id || null,
      paycycle_id: paycycleId,
      disbursement_type: options?.information?.disbursement_type || 'bank',
      line_id: options?.information?.line_id || null,
      site_ids: options?.information?.site_ids || [],
    },
    address: {
      street_address: options?.address?.street_address || '',
      sub_district: options?.address?.sub_district || '',
      district: options?.address?.district || '',
      province: options?.address?.province || '',
      postcode: options?.address?.postcode || '',
      ...options?.address,
    },
    bank: {
      bank_code: options?.bank?.bank_code || '014',
      account_name: options?.bank?.account_name || 'QA Test Account',
      account_no: options?.bank?.account_no || generateAccountNo(),
      ...options?.bank,
    },
  };

  return defaultPayload;
}
