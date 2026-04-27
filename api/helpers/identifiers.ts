/**
 * Identifier generators for test data.
 *
 * All generators use timestamp + random suffix to ensure uniqueness across runs.
 * Phone numbers and employee IDs must be generated per-run to avoid collisions
 * in paycycle constraints and Firebase uid mapping.
 *
 * On staging, ALL phone numbers must come from the approved bypass pool — even
 * phones only stored on the employee record and never receiving an OTP.
 * Always use resolvePhone() instead of generatePhone() directly.
 * generatePhone() is a low-level primitive called only by resolvePhone().
 */

import { ENV } from '../../shared/utils/env'
import { PhonePool, getPhonePool } from '../../shared/utils/seed-config'

export function pickPhoneFromPool(pool: PhonePool): string {
  if (pool.start.length !== pool.end.length) {
    throw new Error(
      `pickPhoneFromPool: pool.start "${pool.start}" and pool.end "${pool.end}" must have the same length`
    )
  }
  const start = parseInt(pool.start, 10)
  const end = parseInt(pool.end, 10)
  if (isNaN(start) || isNaN(end) || start > end) {
    throw new Error(
      `pickPhoneFromPool: invalid pool range "${pool.start}"–"${pool.end}"`
    )
  }
  const picked = Math.floor(Math.random() * (end - start + 1)) + start
  return String(picked).padStart(pool.start.length, '0')
}

/**
 * Returns a phone number appropriate for the current environment.
 * On staging: picks from the approved bypass pool (0881001500–0881001600).
 * On dev: generates a random unique number.
 *
 * Always use this instead of generatePhone() in test and seed code.
 */
export function resolvePhone(): string {
  return ENV === 'staging' ? pickPhoneFromPool(getPhonePool()) : generatePhone()
}

export function generatePhone(): string {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 100)}`.slice(-8)
  return `08${suffix}`
}

export function generateEmployeeId(): string {
  return `EMP${Date.now()}${Math.floor(Math.random() * 100)}`
}

export function generateAccountNo(): string {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-9)
  return `1${suffix}`
}

export function generateNationalId(): string {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-12)
  return `1${suffix}`
}

export function generatePassportNo(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const l1 = letters[Math.floor(Math.random() * 26)]
  const l2 = letters[Math.floor(Math.random() * 26)]
  const digits = `${Date.now()}`.slice(-7)
  return `${l1}${l2}${digits}`
}

export function generateEmail(): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 10000)
  return `qa-signup-${timestamp}-${random}@qa.com`
}
