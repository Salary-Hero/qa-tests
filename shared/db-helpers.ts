/**
 * Centralised database helper functions for test cleanup and verification.
 *
 * Raw query() calls are permitted only in this file.
 * Test files must import named functions from here — never import query() directly.
 */

import { query } from './db'

// ---------------------------------------------------------------------------
// Digital Consent helpers
// ---------------------------------------------------------------------------

/**
 * Finds user IDs in user_identity that match the given national IDs or passport numbers.
 * Used to locate signed-up users from previous runs before the import worker re-runs.
 */
export async function findSignedUpUserIds(
  nationalIds: string[],
  passportNos: string[]
): Promise<string[]> {
  const { rows } = await query<{ legacy_user_id: string }>(
    `SELECT DISTINCT legacy_user_id
     FROM user_identity
     WHERE national_id = ANY($1::text[])
        OR passport_no = ANY($2::text[])`,
    [nationalIds, passportNos]
  )
  return rows.map((r) => r.legacy_user_id)
}

/**
 * Hard-deletes employee_profile and employee_profile_audit rows for the given
 * employee IDs and company. Must delete audit rows first (FK constraint).
 *
 * Hard delete is required — soft delete is not sufficient because the import
 * worker treats soft-deleted rows with consent_status='pending_review' as
 * already signed up and refuses to re-create records for those employee_ids.
 */
export async function deleteEmployeeProfileRecords(
  employeeIds: string[],
  companyId: number
): Promise<void> {
  await query(
    `DELETE FROM employee_profile_audit
     WHERE employee_profile_id IN (
       SELECT id FROM employee_profile
       WHERE employee_id = ANY($1::text[])
         AND company_id = $2
     )`,
    [employeeIds, companyId]
  )

  await query(
    `DELETE FROM employee_profile
     WHERE employee_id = ANY($1::text[])
       AND company_id = $2`,
    [employeeIds, companyId]
  )
}

/**
 * Returns employee_profile rows for the given employee IDs and company.
 * Used to verify consent_status after import or signup.
 */
export async function getEmployeeProfiles(
  employeeIds: string[],
  companyId: number
): Promise<{ employee_id: string; consent_status: string }[]> {
  const { rows } = await query<{ employee_id: string; consent_status: string }>(
    `SELECT employee_id, consent_status
     FROM employee_profile
     WHERE employee_id = ANY($1::text[])
       AND company_id = $2
       AND deleted_at IS NULL`,
    [employeeIds, companyId]
  )
  return rows
}

/**
 * Returns the consent_status for a single employee.
 * Returns null if no matching row exists.
 */
export async function getEmployeeConsentStatus(
  employeeId: string,
  companyId: number
): Promise<string | null> {
  const { rows } = await query<{ consent_status: string }>(
    `SELECT consent_status FROM employee_profile
     WHERE employee_id = $1 AND company_id = $2 AND deleted_at IS NULL`,
    [employeeId, companyId]
  )
  return rows[0]?.consent_status ?? null
}

// ---------------------------------------------------------------------------
// Employee / User helpers
// ---------------------------------------------------------------------------

export async function getUserById(userId: number) {
  const result = await query<{ user_id: number; email: string; first_name: string; last_name: string; status: string }>(
    `SELECT user_id, email, first_name, last_name, status FROM users WHERE user_id = $1`,
    [userId]
  )

  if (result.rows.length === 0) {
    throw new Error(`User with ID ${userId} not found`)
  }

  return result.rows[0]
}
