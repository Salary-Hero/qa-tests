/**
 * Test Helper Functions
 * Utility functions for retrieving and verifying test data from the database
 */

import { query } from './db';

export async function getCompanyById(companyId: number) {
  const result = await query(
    `SELECT company_id, name, email, status FROM company WHERE company_id = $1`,
    [companyId]
  );

  if (result.rows.length === 0) {
    throw new Error(`Company with ID ${companyId} not found`);
  }

  return result.rows[0];
}

export async function getEmploymentById(employmentId: string) {
  const result = await query(
    `SELECT 
       employment_id, user_uid, legacy_user_id, company_id, 
       employee_id, start_date, end_date, status, salary_type, employee_type
     FROM employment 
     WHERE employment_id = $1`,
    [employmentId]
  );

  if (result.rows.length === 0) {
    throw new Error(`Employment with ID ${employmentId} not found`);
  }

  return result.rows[0];
}

export async function getUserById(userId: number) {
  const result = await query(
    `SELECT user_id, email, first_name, last_name, status FROM users WHERE user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error(`User with ID ${userId} not found`);
  }

  return result.rows[0];
}

export async function getUserIdentityByUid(userUid: string) {
  const result = await query(
    `SELECT 
       user_uid, legacy_user_id, personal_email, first_name, 
       last_name, phone_number, created_at, updated_at
     FROM user_identity 
     WHERE user_uid = $1`,
    [userUid]
  );

  if (result.rows.length === 0) {
    throw new Error(`User identity with UID ${userUid} not found`);
  }

  return result.rows[0];
}

export async function getEmploymentByUserId(userId: number) {
  const result = await query(
    `SELECT 
       employment_id, user_uid, legacy_user_id, company_id,
       employee_id, status, salary_type, employee_type
     FROM employment 
     WHERE legacy_user_id = $1`,
    [userId]
  );

  return result.rows;
}

export async function verifyEmployeeData(
  employmentId: string,
  expectedData: Record<string, any>
) {
  const employment = await getEmploymentById(employmentId);
  const user = await getUserById(employment.legacy_user_id);

  const errors: string[] = [];

  for (const [key, expectedValue] of Object.entries(expectedData)) {
    const actualValue = employment[key] || user[key];
    if (actualValue !== expectedValue) {
      errors.push(
        `${key}: expected ${expectedValue}, got ${actualValue}`
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(`Employee data verification failed: ${errors.join(', ')}`);
  }

  return { employment, user };
}

/**
 * Delete employee and related records by user ID
 * Respects foreign key constraints: employment → user_identity → users
 * 
 * @param userId - User ID to delete
 * @returns Object with count of deleted records from each table
 * @throws Error if user not found or deletion fails
 */
export async function deleteEmployeeByUserId(userId: number): Promise<{ employment: number; user_identity: number; users: number }> {
  try {
    // Verify user exists before deletion
    await getUserById(userId);
  } catch (error) {
    throw new Error(`Cannot delete: User ${userId} not found`);
  }

  const results = {
    employment: 0,
    user_identity: 0,
    users: 0,
  };

  // Delete in order: employment → user_identity → users
  // This respects foreign key constraints
  try {
    const employmentResult = await query('DELETE FROM employment WHERE legacy_user_id = $1', [userId]);
    results.employment = employmentResult.rowCount;
    
    const identityResult = await query('DELETE FROM user_identity WHERE legacy_user_id = $1', [userId]);
    results.user_identity = identityResult.rowCount;
    
    const usersResult = await query('DELETE FROM users WHERE user_id = $1', [userId]);
    results.users = usersResult.rowCount;
    return results;
  } catch (error) {
    throw new Error(`Failed to delete employee ${userId}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
