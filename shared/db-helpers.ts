/**
 * Centralised database helper functions for test cleanup and verification.
 *
 * Raw query() calls are permitted only in this file.
 * Test files must import named functions from here — never import query() directly.
 */

import { query, getClient } from './db'

// ---------------------------------------------------------------------------
// Digital Consent helpers
// ---------------------------------------------------------------------------

/**
 * Hard-deletes all users from previous digital consent test runs.
 * Searches by national_id and passport_no — used when identity values are
 * pre-loaded in the import file (standard consent flow).
 */
export async function cleanupConsentSignedUpUsers(
  nationalIds: string[],
  passportNos: string[]
): Promise<void> {
  const userIds = await findSignedUpUserIds(nationalIds, passportNos)
  for (const userId of userIds) {
    await hardDeleteEmployee(userId)
  }
}

/**
 * Hard-deletes all users from previous digital consent employee-ID-only test runs.
 * Searches by employee_id via the employment table — used when the import file
 * has no pre-loaded national_id or passport_no values.
 */
export async function cleanupConsentEidSignedUpUsers(
  employeeIds: string[],
  companyId: number
): Promise<void> {
  const userIds = await findSignedUpUserIdsByEmployeeIds(employeeIds, companyId)
  for (const userId of userIds) {
    try {
      await hardDeleteEmployee(userId)
    } catch {
      // best-effort — user may already be gone
    }
  }
}

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
 * Finds user IDs for employees that have signed up, searched by employee_id
 * and company_id via the employment table.
 *
 * Used for companies that import employee_id only (no national_id/passport_no
 * pre-loaded in the import), where findSignedUpUserIds() cannot be used because
 * there are no identity values to search by in user_identity.
 */
export async function findSignedUpUserIdsByEmployeeIds(
  employeeIds: string[],
  companyId: number
): Promise<string[]> {
  const { rows } = await query<{ user_id: string }>(
    `SELECT DISTINCT u.user_id::text
     FROM users u
     JOIN employment e ON e.legacy_user_id = u.user_id
     WHERE e.employee_id = ANY($1::text[])
       AND e.company_id = $2`,
    [employeeIds, companyId]
  )
  return rows.map((r) => r.user_id)
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

/**
 * Returns the count of employee_profile rows for consent fixture employees
 * (employee_id LIKE 'EMPAPI-CONSENT-%') scoped to the given company IDs.
 *
 * Used in preview mode to report how many rows would be deleted without
 * actually deleting them.
 */
export async function countConsentEmployeeProfiles(companyIds: number[]): Promise<number> {
  const { rows } = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM employee_profile
     WHERE employee_id LIKE 'EMPAPI-CONSENT-%'
       AND company_id = ANY($1::int[])`,
    [companyIds]
  )
  return parseInt(rows[0]?.count ?? '0', 10)
}

/**
 * Hard-deletes employee_profile and employee_profile_audit rows for consent
 * fixture employees (employee_id LIKE 'EMPAPI-CONSENT-%') scoped to the given
 * company IDs.
 *
 * Purpose: reset import state so the digital consent import flow can be re-run
 * from scratch. Deletes profile rows regardless of whether a matching user
 * exists — the import worker creates these rows independently of user sign-up.
 *
 * Audit rows must be deleted first (FK constraint:
 * employee_profile_audit → employee_profile).
 */
export async function cleanupConsentEmployeeProfiles(
  companyIds: number[]
): Promise<{ profilesDeleted: number; auditRowsDeleted: number }> {
  const auditResult = await query(
    `DELETE FROM employee_profile_audit
     WHERE employee_profile_id IN (
       SELECT id FROM employee_profile
       WHERE employee_id LIKE 'EMPAPI-CONSENT-%'
         AND company_id = ANY($1::int[])
     )`,
    [companyIds]
  )

  const profileResult = await query(
    `DELETE FROM employee_profile
     WHERE employee_id LIKE 'EMPAPI-CONSENT-%'
       AND company_id = ANY($1::int[])`,
    [companyIds]
  )

  return {
    profilesDeleted: profileResult.rowCount ?? 0,
    auditRowsDeleted: auditResult.rowCount ?? 0,
  }
}

// ---------------------------------------------------------------------------
// Employee / User helpers
// ---------------------------------------------------------------------------

/**
 * Hard-deletes a user and all associated records from the database.
 *
 * The admin API soft-delete (DELETE /v1/admin/account/employee/:userId) sets
 * deleted_at but leaves the records in place. Soft-deleted phone numbers and
 * bank account numbers are still subject to the paycycle uniqueness constraint,
 * causing "already used in this paycycle" errors on subsequent test runs.
 *
 * FK dependency order (confirmed from DB schema):
 *
 *   user_balance
 *     ↑ fk_user_identity_balance  (user_identity.balance_uid → user_balance.balance_uid)
 *   user_identity
 *     ↑ fk_employment_user_identity  (employment.user_uid → user_identity.user_uid)
 *   employment
 *     ↑ employment_employee_profile_fk  (employee_profile.employment_id → employment.employment_id)
 *   employee_profile
 *     ↑ employee_profile_employee_profile_audit_fk  (employee_profile_audit → employee_profile)
 *   employee_profile_audit
 *
 * Safe delete order:
 *   1. Read user_uid + balance_uid from user_identity before any deletes
 *   2. employee_profile_audit  (deleted — FK constraint)
 *   3. employee_profile        (RESET to consent_status='new', user_id=NULL — row kept for re-use)
 *   4. employment  (references user_identity.user_uid)
 *   5. user_identity  (references user_balance.balance_uid)
 *   6. user_balance
 *   7. user_bank
 *   8. user_provider  (no FK to users — must delete explicitly, not cascaded)
 *   9. company_user_sites  (FK → users — must delete before users)
 *  10. users
 *
 * All statements run inside a single transaction — partial cleanup is never
 * left behind if one statement fails.
 */
export async function hardDeleteEmployee(userId: string): Promise<void> {
  if (!userId) return

  const numericId = parseInt(userId, 10)
  if (isNaN(numericId) || numericId <= 0) {
    throw new Error(`hardDeleteEmployee: invalid userId "${userId}"`)
  }

  const client = await getClient()
  try {
    await client.query('BEGIN')

    // Read UUIDs needed for downstream deletes before any rows are removed
    const identityResult = await client.query<{ user_uid: string; balance_uid: string | null }>(
      `SELECT user_uid, balance_uid FROM user_identity WHERE legacy_user_id = $1::bigint`,
      [numericId]
    )
    const userUid = identityResult.rows[0]?.user_uid ?? null
    const balanceUid = identityResult.rows[0]?.balance_uid ?? null

    // employee_profile_audit — FK → employee_profile
    await client.query(
      `DELETE FROM employee_profile_audit
       WHERE employee_profile_id IN (
         SELECT id FROM employee_profile WHERE user_id = $1::bigint
       )`,
      [numericId]
    )

    // employee_profile — reset to post-import state rather than deleting.
    // These rows are created by the screening import and are not owned by the user;
    // deleting them would leave the employee unable to sign up again in subsequent
    // serial tests (screening validate returns 400 with no row present).
    await client.query(
      `UPDATE employee_profile
       SET consent_status = 'new',
           user_id        = NULL,
           employment_id  = NULL,
           updated_at     = NOW(),
           deleted_at     = NULL
       WHERE user_id = $1::bigint`,
      [numericId]
    )

    // employment — FK → user_identity.user_uid
    if (userUid) {
      await client.query(
        `DELETE FROM employment WHERE user_uid = $1::uuid`,
        [userUid]
      )
    }

    // user_identity — FK → user_balance.balance_uid
    await client.query(
      `DELETE FROM user_identity WHERE legacy_user_id = $1::bigint`,
      [numericId]
    )

    // user_balance — must come after user_identity (which references it)
    if (balanceUid) {
      await client.query(
        `DELETE FROM user_balance WHERE balance_uid = $1::uuid`,
        [balanceUid]
      )
    }

    // user_bank — no FK dependents, safe to delete any time before users
    await client.query(
      `DELETE FROM user_bank WHERE user_id = $1::bigint`,
      [numericId]
    )

    // user_provider — no FK constraint to users, deletion is not cascaded automatically
    await client.query(
      `DELETE FROM user_provider WHERE user_id = $1::bigint`,
      [numericId]
    )

    // company_user_sites — FK → users, must be deleted before users
    await client.query(
      `DELETE FROM company_user_sites WHERE user_id = $1::bigint`,
      [numericId]
    )

    // users — root record
    await client.query(
      `DELETE FROM users WHERE user_id = $1::bigint`,
      [numericId]
    )

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw new Error(
      `hardDeleteEmployee(${userId}) failed — transaction rolled back\n${err}`
    )
  } finally {
    client.release()
  }
}

export async function getUserById(userId: number) {
  const result = await query<{
    user_id: number
    email: string
    first_name: string
    last_name: string
    status: string
  }>(
    `SELECT user_id, email, first_name, last_name, status FROM users WHERE user_id = $1`,
    [userId]
  )

  if (result.rows.length === 0) {
    throw new Error(`User with ID ${userId} not found`)
  }

  return result.rows[0]
}
