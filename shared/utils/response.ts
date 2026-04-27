import { APIResponse } from '@playwright/test'
import { ZodSchema, ZodError } from 'zod'

/**
 * Parses an API response body against a Zod schema and returns the typed result.
 *
 * On failure, logs the full request/response context before throwing so the
 * cause is immediately visible in the test output — no need to rerun with
 * extra logging.
 *
 * Covers three failure scenarios:
 *   1. Unexpected HTTP status — logs method + URL + payload + response body, then throws
 *   2. Non-JSON response      — logs URL + payload + raw text, then throws
 *   3. Schema parse error     — logs URL + payload + raw body + Zod errors, then rethrows
 */
export async function parseResponse<T>(
  response: APIResponse,
  schema: ZodSchema<T>,
  label: string,
  expectedStatus = 200,
  payload?: unknown
): Promise<T> {
  const status = response.status()
  const url = response.url()
  const payloadLine = payload !== undefined
    ? `  Payload:  ${JSON.stringify(payload)}\n`
    : ''

  if (status !== expectedStatus) {
    let body: string
    try {
      body = await response.text()
    } catch {
      body = '<unable to read response body>'
    }
    console.error(
      `[parseResponse] ${label} — unexpected status\n` +
        `  Expected: ${expectedStatus}\n` +
        `  Received: ${status}\n` +
        `  URL:      ${url}\n` +
        payloadLine +
        `  Body:     ${body}`
    )
    throw new Error(
      `${label}: expected status ${expectedStatus}, got ${status}\n` +
        `  URL: ${url}\n` +
        (payload !== undefined ? `  Payload: ${JSON.stringify(payload)}\n` : '') +
        `  Body: ${body}`
    )
  }

  let raw: unknown
  try {
    raw = await response.json()
  } catch {
    const text = await response.text().catch(() => '<unreadable>')
    console.error(
      `[parseResponse] ${label} — failed to parse response as JSON\n` +
        `  URL:     ${url}\n` +
        payloadLine +
        `  Body:    ${text}`
    )
    throw new Error(
      `${label}: response is not valid JSON\n` +
        `  URL: ${url}\n` +
        (payload !== undefined ? `  Payload: ${JSON.stringify(payload)}\n` : '') +
        `  Body: ${text}`
    )
  }

  try {
    return schema.parse(raw)
  } catch (err) {
    if (err instanceof ZodError) {
      console.error(
        `[parseResponse] ${label} — schema validation failed\n` +
          `  URL:     ${url}\n` +
          payloadLine +
          `  Body:    ${JSON.stringify(raw, null, 2)}\n` +
          `  Errors:  ${JSON.stringify(err.format(), null, 2)}`
      )
    }
    throw err
  }
}
