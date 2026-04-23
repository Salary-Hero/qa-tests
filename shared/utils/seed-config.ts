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

export type SeedConfigForEnv = {
  companies: Record<AuthMethod, Company>
  fixedIdentifiers: FixedIdentifiers
  otp: string
}

type SeedConfigFile = Record<string, SeedConfigForEnv>

const config = seedConfig as SeedConfigFile

if (!config[ENV]) {
  throw new Error(`seed-config.json does not contain an entry for ENV="${ENV}"`)
}

export const seedConfigForEnv: SeedConfigForEnv = config[ENV]

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
