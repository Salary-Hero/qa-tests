/**
 * Authentication Utilities
 * Handles admin login and token management for API tests
 */

import { APIRequestContext } from '@playwright/test';
import { getApiBaseUrl, ADMIN_EMAIL, ADMIN_PASSWORD, validateApiConfig } from './env-config';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

/**
 * Login as admin and return access token
 * @param request - Playwright request context
 * @param email - Admin email
 * @param password - Admin password
 * @returns Access token for Bearer authentication
 */
export async function loginAsAdmin(
  request: APIRequestContext,
  email?: string,
  password?: string
): Promise<string> {
  validateApiConfig();

  const adminEmail = email || ADMIN_EMAIL;
  const adminPassword = password || ADMIN_PASSWORD;

  const baseUrl = getApiBaseUrl();

  try {
    const response = await request.post(`${baseUrl}/v1/public/account/admin/login`, {
      data: {
        email: adminEmail,
        password: adminPassword,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok()) {
      const error = await response.text();
      throw new Error(`Login failed with status ${response.status()}: ${error}`);
    }

    const responseBody = (await response.json()) as LoginResponse;

    if (!responseBody.accessToken) {
      throw new Error('No accessToken in login response');
    }

    return responseBody.accessToken;
  } catch (error) {
    console.error('❌ Admin login failed:', error);
    throw error;
  }
}

/**
 * Get authorization headers with bearer token
 * @param token - Access token
 * @returns Headers object with Authorization
 */
export function getAuthHeaders(token: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}
