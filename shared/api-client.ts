/**
 * API Client Utilities
 * Provides request wrapper with automatic authentication
 */

import { APIRequestContext } from '@playwright/test';
import { getApiBaseUrl, getEnvironment } from './env-config';
import { getAuthHeaders } from './auth';

export interface ApiResponse<T = any> {
  status: number;
  ok: boolean;
  body: T;
  headers: Record<string, string>;
}

/**
 * Make authenticated API request
 * @param request - Playwright request context
 * @param method - HTTP method
 * @param endpoint - API endpoint (e.g., /v1/admin/account/employee/128)
 * @param token - Bearer token
 * @param data - Request body data
 * @returns API response with status, ok flag, and parsed body
 */
export async function makeApiRequest<T = any>(
  request: APIRequestContext,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  endpoint: string,
  token: string,
  data?: any
): Promise<ApiResponse<T>> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  const headers = getAuthHeaders(token);

  try {
    const requestOptions: any = {
      headers,
    };

    if (data) {
      requestOptions.data = data;
    }

    const response = await request[method.toLowerCase() as 'get' | 'post' | 'patch' | 'put' | 'delete'](
      url,
      requestOptions
    );

    const responseHeaders = response.headers();

    let body: T;
    const contentType = responseHeaders['content-type'] || '';

    if (contentType.includes('application/json')) {
      body = (await response.json()) as T;
    } else {
      body = (await response.text()) as any;
    }

    const result: ApiResponse<T> = {
      status: response.status(),
      ok: response.ok(),
      body,
      headers: responseHeaders as Record<string, string>,
    };

    if (response.ok()) {
      console.log(`✅ ${method} ${url} - Status ${response.status()}`);
    } else {
      console.log(`⚠️ ${method} ${url} - Status ${response.status()}`);
    }

    return result;
  } catch (error) {
    console.error(`❌ ${method} ${url} - Error:`, error);
    throw error;
  }
}

/**
 * Convenience wrappers for common HTTP methods
 */

export async function apiGet<T = any>(
  request: APIRequestContext,
  endpoint: string,
  token: string
): Promise<ApiResponse<T>> {
  return makeApiRequest<T>(request, 'GET', endpoint, token);
}

export async function apiPost<T = any>(
  request: APIRequestContext,
  endpoint: string,
  token: string,
  data: any
): Promise<ApiResponse<T>> {
  return makeApiRequest<T>(request, 'POST', endpoint, token, data);
}

export async function apiPatch<T = any>(
  request: APIRequestContext,
  endpoint: string,
  token: string,
  data: any
): Promise<ApiResponse<T>> {
  return makeApiRequest<T>(request, 'PATCH', endpoint, token, data);
}

export async function apiPut<T = any>(
  request: APIRequestContext,
  endpoint: string,
  token: string,
  data: any
): Promise<ApiResponse<T>> {
  return makeApiRequest<T>(request, 'PUT', endpoint, token, data);
}

export async function apiDelete<T = any>(
  request: APIRequestContext,
  endpoint: string,
  token: string
): Promise<ApiResponse<T>> {
  return makeApiRequest<T>(request, 'DELETE', endpoint, token);
}
