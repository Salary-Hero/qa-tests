import { Pool, PoolClient } from 'pg';

const rawPort = process.env.DB_PORT ?? '5432'
const port = parseInt(rawPort, 10)
if (isNaN(port) || port <= 0) {
  throw new Error(`Invalid DB_PORT: "${rawPort}" — must be a positive integer`)
}

if (!process.env.DB_NAME) throw new Error('DB_NAME environment variable is not set')
if (!process.env.DB_USER) throw new Error('DB_USER environment variable is not set')
if (!process.env.DB_PASSWORD) throw new Error('DB_PASSWORD environment variable is not set')

const pool = new Pool({
  host: process.env.DB_HOST ?? 'localhost',
  port,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

/**
 * Internal DB primitive — import only from shared/db-helpers.ts.
 * Test files must never import query() or getClient() directly.
 */
export async function query<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> {
  try {
    const result = await pool.query(text, params);
    return { rows: result.rows, rowCount: result.rowCount || 0 };
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/** Internal DB primitive — import only from shared/db-helpers.ts. */
export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

export async function closePool(): Promise<void> {
  await pool.end();
}
