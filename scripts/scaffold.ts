/**
 * Scaffold script — creates the boilerplate files for a new API test feature.
 *
 * Usage:
 *   yarn scaffold <feature-name>
 *
 * Example:
 *   yarn scaffold withdrawal
 *
 * Creates:
 *   api/tests/withdrawal/withdrawal.test.ts   (from _template.test.ts)
 *   api/schema/withdrawal.schema.ts           (empty Zod schema stub)
 *
 * Does NOT overwrite existing files.
 */

import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(__dirname, '..')

function fail(msg: string): never {
  console.error(`\nError: ${msg}\n`)
  process.exit(1)
}

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

function writeIfAbsent(filePath: string, content: string, label: string): void {
  if (fs.existsSync(filePath)) {
    console.log(`  skipped  ${label} (already exists)`)
    return
  }
  fs.writeFileSync(filePath, content, 'utf8')
  console.log(`  created  ${label}`)
}

function buildTestFile(feature: string): string {
  const templatePath = path.join(ROOT, 'api', 'tests', '_template.test.ts')
  if (!fs.existsSync(templatePath)) {
    fail(`Template not found at api/tests/_template.test.ts`)
  }
  return fs.readFileSync(templatePath, 'utf8')
}

function buildSchemaFile(feature: string): string {
  return `import { z } from 'zod'

// TODO: Replace this stub with the actual response shape.
// Every field asserted in the test must be declared here.
// Use .optional() for fields that may not always be present.
//
// Example:
//   export const ${toCamel(feature)}ResponseSchema = z.object({
//     id: z.string(),
//     status: z.string(),
//     created_at: z.string().optional(),
//   })

export const ${toCamel(feature)}ResponseSchema = z.object({
  // TODO: add fields
}).passthrough() // TODO: remove passthrough() once all fields are declared
`
}

function toCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
}

function main(): void {
  const feature = process.argv[2]?.trim()

  if (!feature) {
    fail('Please provide a feature name.\n\n  Usage: yarn scaffold <feature-name>\n  Example: yarn scaffold withdrawal')
  }

  if (!/^[a-z][a-z0-9-]*$/.test(feature)) {
    fail(`Feature name must be lowercase letters, numbers, and hyphens only (e.g. "withdrawal", "signup-phone")`)
  }

  console.log(`\nScaffolding feature: ${feature}\n`)

  const testDir = path.join(ROOT, 'api', 'tests', feature)
  const schemaDir = path.join(ROOT, 'api', 'schema')

  ensureDir(testDir)
  ensureDir(schemaDir)

  writeIfAbsent(
    path.join(testDir, `${feature}.test.ts`),
    buildTestFile(feature),
    `api/tests/${feature}/${feature}.test.ts`
  )

  writeIfAbsent(
    path.join(schemaDir, `${feature}.schema.ts`),
    buildSchemaFile(feature),
    `api/schema/${feature}.schema.ts`
  )

  console.log(`
Next steps:
  1. Open api/tests/${feature}/${feature}.test.ts and replace every TODO
  2. Open api/schema/${feature}.schema.ts and add the API response fields
  3. Add endpoint URLs to shared/endpoints.ts
  4. Run: yarn tsc          (must pass before running tests)
  5. Run: yarn test:api --grep "${feature}"

Full guide: docs/API_TESTING_GUIDE.md
`)
}

main()
