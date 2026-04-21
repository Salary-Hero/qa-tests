/**
 * Identifier generators for test data.
 *
 * All generators use timestamp + random suffix to ensure uniqueness across runs.
 * Phone numbers and employee IDs must be generated per-run to avoid collisions
 * in paycycle constraints and Firebase uid mapping.
 */

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
