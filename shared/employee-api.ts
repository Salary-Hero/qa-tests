/**
 * Employee API Utilities
 * Helpers for creating and updating employees via API
 */

import { APIRequestContext } from '@playwright/test';
import { apiPost, apiPatch, apiDelete } from './api-client';
import { TEST_COMPANY_ID } from './env-config';

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
  [key: string]: any;
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

/**
 * Create an employee via API
 * @param request - Playwright request context
 * @param token - Bearer token
 * @param data - Employee data (information, address, bank)
 * @param companyId - Company ID (defaults to 128)
 * @returns Employee response with user_id
 */
export async function createEmployeeViaAPI(
  request: APIRequestContext,
  token: string,
  data: EmployeePayload,
  companyId: number = TEST_COMPANY_ID
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

  const userId = response.body.information.user_id;
  return response.body;
}

/**
 * Update an employee via API
 * @param request - Playwright request context
 * @param token - Bearer token
 * @param userId - User ID from created employee
 * @param data - Employee data to update
 * @param companyId - Company ID (defaults to 128)
 * @returns Updated employee response
 */
export async function updateEmployeeViaAPI(
  request: APIRequestContext,
  token: string,
  userId: number,
  data: EmployeePayload,
  companyId: number = TEST_COMPANY_ID
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

/**
 * Delete an employee via API
 * @param request - Playwright request context
 * @param token - Bearer token
 * @param userId - User ID to delete
 * @returns Delete response
 */
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
 * Delete employee via API with fallback to database deletion
 * Attempts API delete first, falls back to database if API fails
 * 
 * @param request - Playwright request context
 * @param token - Bearer token
 * @param userId - User ID to delete
 * @returns true if API delete succeeded, false if fallback to database was used
 */
export async function deleteEmployeeViaAPIWithFallback(
  request: APIRequestContext,
  token: string,
  userId: number
): Promise<boolean> {
  try {
    await deleteEmployeeViaAPI(request, token, userId);
    return true;
  } catch (error) {
    console.warn(`Delete via API failed for ${userId}, attempting database fallback...`);
    try {
      // Lazy import to avoid circular dependency
      const { deleteEmployeeByUserId } = await import('./test-helpers');
      await deleteEmployeeByUserId(userId);
      return false;
    } catch (fallbackError) {
      throw new Error(
        `Delete failed for ${userId} - API: ${error instanceof Error ? error.message : String(error)}, DB: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`
      );
    }
  }
}

/**
 * Build update payload from employee's current data with changes
  * Build update payload with only writable fields
  * API response includes read-only fields (user_id, created_at, updated_at, etc)
  * Sending these back in PATCH causes 403 Permission Denied
  * @param originalEmployee - Current employee data from API response
  * @param updates - Fields to update (merged with original)
  * @returns Complete update payload with only writable fields
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
      mergedInformation[field] = value;
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
      account_no: generateRandomString(10),
    },
  };
}

/**
 * Generate truly random numeric string with high entropy
 */
function generateRandomString(length: number): string {
  let result = '';
  // Use multiple sources of randomness to avoid collisions
  const seedStr = Date.now().toString() + Math.random().toString().slice(2) + Math.random().toString().slice(2);
  for (let i = 0; i < length; i++) {
    result += parseInt(seedStr.charAt((i * 7 + i * Math.random() * 13) % seedStr.length)) % 10;
  }
  return result;
}

/**
 * Build a complete employee payload for create/update
 * @param firstName - First name (required)
 * @param options - Additional employee fields
 * @returns Complete employee payload
 */
export function buildEmployeePayload(
  firstName: string,
  options?: Partial<EmployeePayload>
): EmployeePayload {
  // Ensure numeric fields are numbers, not strings
  const paycycleId = options?.information?.paycycle_id
    ? Number(options.information.paycycle_id)
    : 3661;
  const salary = options?.information?.salary
    ? Number(options.information.salary)
    : 30000;
  const companyId = String(options?.information?.company_id || TEST_COMPANY_ID);

  // Generate truly unique identifiers
  // Use random numbers to ensure uniqueness across test runs
  
  // Generate unique bank account (10 digits)
  const uniqueBankAccount = options?.bank?.account_no || generateRandomString(10);
  
  // Generate unique phone number (10 digits, starting with 09)
  const uniquePhone = options?.information?.phone || `09${generateRandomString(8)}`;

  const defaultPayload: EmployeePayload = {
    information: {
      first_name: firstName,
      last_name: options?.information?.last_name || 'QA Test',
      email: options?.information?.email || '',
      phone: uniquePhone,
      status: options?.information?.status || 'active',
      is_blacklist: options?.information?.is_blacklist ?? false,
      salary,
      salary_type: options?.information?.salary_type || 'monthly',
      employee_id: options?.information?.employee_id || `QA-${Date.now()}`,
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
      account_no: uniqueBankAccount,
      ...options?.bank,
    },
  };

  return defaultPayload;
}
