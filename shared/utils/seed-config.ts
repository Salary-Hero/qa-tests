import seedConfig from '../fixtures/seed-config.json'
import { ENV } from './env'

export type AuthMethod = 'phone' | 'line' | 'employee_id' | 'entra_id' | 'digital_consent'

export type Company = {
  id: number
  name: string
  qa_paycycle_id: number
}

export type FixedIdentifiers = {
  line_id: string
  email: string
}

export type PhonePool = {
  start: string
  end: string
}

export type OtpBypass = {
  code: string
  ref_code: string
}

export type SeedConfigForEnv = {
  companies: Record<AuthMethod, Company>
  fixedIdentifiers: FixedIdentifiers
  otp: string
  pincode: string
  phonePool?: PhonePool
  otpBypass?: OtpBypass
}

type SeedConfigFile = Record<string, SeedConfigForEnv>

const config = seedConfig as SeedConfigFile

if (!config[ENV]) {
  throw new Error(`seed-config.json does not contain an entry for ENV="${ENV}"`)
}

export const seedConfigForEnv: SeedConfigForEnv = config[ENV]

// OTP and PINCODE come from seed-config.json per environment — never hardcoded defaults.
// OTP: dev=111111, staging=199119. Using a wrong OTP on staging sends a real SMS.
export const OTP: string = seedConfigForEnv.otp
export const PINCODE: string = seedConfigForEnv.pincode

export function getCompany(method: AuthMethod): Company {
  const company = seedConfigForEnv.companies[method]
  if (!company || company.id === 0) {
    throw new Error(
      `seed-config.json: company for "${method}" is not configured for ENV="${ENV}"`
    )
  }
  return company
}

export function getFixedIdentifier(key: keyof FixedIdentifiers): string {
  const value = seedConfigForEnv.fixedIdentifiers[key]
  if (!value || value === 'TBD') {
    throw new Error(
      `seed-config.json: fixed identifier "${key}" is not configured for ENV="${ENV}"`
    )
  }
  return value
}

export function getPhonePool(): PhonePool {
  const pool = seedConfigForEnv.phonePool
  if (!pool) {
    throw new Error(
      `seed-config.json: phonePool is not configured for ENV="${ENV}"`
    )
  }
  return pool
}

export function getOtpBypass(): OtpBypass {
  const bypass = seedConfigForEnv.otpBypass
  if (!bypass) {
    throw new Error(
      `seed-config.json: otpBypass is not configured for ENV="${ENV}"`
    )
  }
  return bypass
}
