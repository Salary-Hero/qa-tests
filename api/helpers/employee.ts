import { APIRequestContext } from '@playwright/test'

export interface Employee {
  id: number
  phone: string
}

export async function createEmployee(
  request: APIRequestContext,
  data: { phone: string; [key: string]: unknown }
): Promise<Employee> {
  const response = await request.post('/api/v1/admin/employees', { data })

  if (!response.ok()) {
    throw new Error(
      `createEmployee failed: ${response.status()} ${await response.text()}`
    )
  }

  const body = await response.json()
  return { id: body.data.id, phone: data.phone }
}

export async function deleteEmployee(
  request: APIRequestContext,
  id: number
): Promise<void> {
  const response = await request.delete(`/api/v1/admin/employees/${id}`)

  if (!response.ok()) {
    throw new Error(
      `deleteEmployee failed: ${response.status()} ${await response.text()}`
    )
  }
}

export async function cleanupSignup(
  request: APIRequestContext,
  phone: string
): Promise<void> {
  const response = await request.delete(`/api/v1/admin/signup/${phone}`)

  if (!response.ok()) {
    throw new Error(
      `cleanupSignup failed: ${response.status()} ${await response.text()}`
    )
  }
}
