import { APIRequestContext } from '@playwright/test'

export async function get(
  request: APIRequestContext,
  path: string,
  token?: string
) {
  return request.get(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
}

export async function post(
  request: APIRequestContext,
  path: string,
  data: unknown,
  token?: string
) {
  return request.post(path, {
    data,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
}
