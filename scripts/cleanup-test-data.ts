/**
 * Cleanup script for leftover QA test employees.
 *
 * Identifies employees by two patterns, scoped to QA company IDs only:
 *   - employee_id LIKE 'EMPAPI%'   (all seeded employees — signup + CRUD tests)
 *   - email LIKE 'qa-signup-%@qa.com'  (all signup-flow employees)
 *
 * Usage:
 *   yarn cleanup:dev              preview mode — prints users, asks confirmation
 *   yarn cleanup:dev --force      delete without prompting
 *   yarn cleanup:staging --force
 */

// Env vars are loaded via -r dotenv/config with DOTENV_CONFIG_PATH set by the
// package.json script — no explicit dotenv.config() call needed here.

import * as readline from 'readline'
import { seedConfigForEnv } from '../shared/utils/seed-config'
import { query } from '../shared/db'
import { hardDeleteEmployee } from '../shared/db-helpers'

const FORCE = process.argv.includes('--force')

type LeaftoverUser = {
  user_id: string
  email: string
  first_name: string
  last_name: string
  company_id: string
  employee_id: string
  created_at: string
}

async function findLeftoverUsers(): Promise<LeaftoverUser[]> {
  const qaCompanyIds = Object.values(seedConfigForEnv.companies)
    .map((c) => c.id)
    .filter((id) => id > 0)

  if (qaCompanyIds.length === 0) {
    throw new Error('No QA company IDs configured for this environment')
  }

  const { rows } = await query<LeaftoverUser>(
    `SELECT
       u.user_id::text,
       u.email,
       u.first_name,
       u.last_name,
       e.company_id::text,
       e.employee_id,
       u.created_at::text
     FROM users u
     JOIN employment e ON e.legacy_user_id = u.user_id
     WHERE e.company_id = ANY($1::int[])
       AND (
          e.employee_id LIKE 'EMPAPI%'
          OR u.email LIKE 'qa-signup-%@qa.com'
       )
     ORDER BY u.created_at DESC`,
    [qaCompanyIds]
  )

  return rows
}

function printTable(users: LeaftoverUser[]): void {
  const colWidths = {
    user_id: 10,
    email: 40,
    first_name: 15,
    last_name: 15,
    company_id: 10,
    employee_id: 22,
    created_at: 25,
  }

  const header = [
    'user_id'.padEnd(colWidths.user_id),
    'email'.padEnd(colWidths.email),
    'first_name'.padEnd(colWidths.first_name),
    'last_name'.padEnd(colWidths.last_name),
    'company_id'.padEnd(colWidths.company_id),
    'employee_id'.padEnd(colWidths.employee_id),
    'created_at'.padEnd(colWidths.created_at),
  ].join('  ')

  const divider = '-'.repeat(header.length)

  console.log(divider)
  console.log(header)
  console.log(divider)

  for (const u of users) {
    console.log(
      [
        u.user_id.padEnd(colWidths.user_id),
        (u.email || '').substring(0, colWidths.email).padEnd(colWidths.email),
        (u.first_name || '').substring(0, colWidths.first_name).padEnd(colWidths.first_name),
        (u.last_name || '').substring(0, colWidths.last_name).padEnd(colWidths.last_name),
        u.company_id.padEnd(colWidths.company_id),
        (u.employee_id || '').padEnd(colWidths.employee_id),
        (u.created_at || '').substring(0, colWidths.created_at).padEnd(colWidths.created_at),
      ].join('  ')
    )
  }

  console.log(divider)
}

async function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'y')
    })
  })
}

/**
 * Removes orphaned user_provider rows for QA company IDs where the user
 * has already been deleted from the users table.
 *
 * user_provider has no FK constraint to users — rows are not automatically
 * cascaded when a user is deleted. This catches any rows left behind by
 * previous hardDeleteEmployee() calls that predate this fix.
 *
 * Filter: ref_id LIKE '{company_id}-EMP%' matches the format
 * '{company_id}-{employee_id}@user.com' used by all test employees.
 * Scoping to QA company IDs prevents accidental deletion of non-QA rows.
 */
async function cleanupOrphanedUserProviders(): Promise<void> {
  const qaCompanyIds = Object.values(seedConfigForEnv.companies)
    .map((c) => c.id)
    .filter((id) => id > 0)

  // Build one LIKE pattern per QA company: '{company_id}-EMP%'
  // Matches both EMPAPI (new) and EMP (legacy) prefixed employee IDs.
  const patterns = qaCompanyIds.map((id) => `${id}-EMP%`)
  const params = patterns.map((p, i) => `ref_id LIKE $${i + 1}`).join(' OR ')

  const result = await query(
    `DELETE FROM user_provider
     WHERE NOT EXISTS (
       SELECT 1 FROM users WHERE users.user_id = user_provider.user_id
     )
     AND (${params})`,
    patterns
  )

  const count = result.rowCount ?? 0
  if (count > 0) {
    console.log(`\nCleaned up ${count} orphaned user_provider row(s).`)
  } else {
    console.log('\nNo orphaned user_provider rows found.')
  }
}

async function main(): Promise<void> {
  const ENV = process.env.ENV ?? 'dev'
  console.log(`\nQA test data cleanup — ENV: ${ENV}\n`)

  console.log('Scanning for leftover test employees...')
  const users = await findLeftoverUsers()

  if (users.length === 0) {
    console.log('No leftover test employees found.')
    await cleanupOrphanedUserProviders()
    process.exit(0)
  }

  printTable(users)
  console.log(`\nFound ${users.length} leftover test employee(s).`)

  if (!FORCE) {
    const proceed = await confirm(`\nDelete all ${users.length} user(s)? [y/N] `)
    if (!proceed) {
      console.log('Aborted — no data deleted.')
      process.exit(0)
    }
  }

  console.log(`\nDeleting ${users.length} user(s)...`)
  let deleted = 0
  const errors: { userId: string; error: string }[] = []

  for (const user of users) {
    try {
      await hardDeleteEmployee(user.user_id)
      deleted++
      process.stdout.write(`  ✓ ${user.user_id} (${user.employee_id || user.email})\n`)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      errors.push({ userId: user.user_id, error: message })
      process.stdout.write(`  ✗ ${user.user_id} — ${message}\n`)
    }
  }

  console.log(`\nDone — deleted ${deleted} / ${users.length} user(s).`)

  // Always clean up orphaned user_provider rows, even if some employees failed to delete
  await cleanupOrphanedUserProviders()

  if (errors.length > 0) {
    console.log(`\n${errors.length} error(s) — the following users were not deleted:`)
    for (const e of errors) {
      console.log(`  user_id ${e.userId}: ${e.error}`)
    }
    process.exit(1)
  }

  process.exit(0)
}

main().catch((err) => {
  console.error('\nFatal error:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
