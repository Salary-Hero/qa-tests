/**
 * Environment Configuration
 * Loads and validates environment variables for API testing
 */

export const API_BASE_URLS = {
  dev: 'https://apiv2-dev.salary-hero.com/api',
  staging: 'https://apiv2-staging.salary-hero.com/api',
} as const;

export type Environment = keyof typeof API_BASE_URLS;

export function getApiBaseUrl(): string {
  const env = (process.env.NODE_ENV || 'dev') as Environment;
  if (!(env in API_BASE_URLS)) {
    throw new Error(`Invalid NODE_ENV: ${env}. Must be one of: ${Object.keys(API_BASE_URLS).join(', ')}`);
  }
  return API_BASE_URLS[env];
}

export function getEnvironment(): Environment {
  return (process.env.NODE_ENV || 'dev') as Environment;
}

function getEnvironmentSuffix(): string {
  const env = process.env.ENV || 'dev';
  return env.toUpperCase();
}

export const ADMIN_EMAIL = process.env[`ADMIN_EMAIL_${getEnvironmentSuffix()}`] || '';
export const ADMIN_PASSWORD = process.env[`ADMIN_PASSWORD_${getEnvironmentSuffix()}`] || '';

export const TEST_COMPANY_ID = 128;

export function validateApiConfig(): void {
  if (!ADMIN_EMAIL) {
    throw new Error(`ADMIN_EMAIL_${getEnvironmentSuffix()} environment variable is not set`);
  }
  if (!ADMIN_PASSWORD) {
    throw new Error(`ADMIN_PASSWORD_${getEnvironmentSuffix()} environment variable is not set`);
  }
  if (!ADMIN_EMAIL.includes('@')) {
    throw new Error('ADMIN_EMAIL is invalid format');
  }
}
