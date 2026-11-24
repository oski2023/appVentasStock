import { Pool, PoolClient } from 'pg';
import { env } from '../config/env.js';

const isRemoteDb = !env.DATABASE_URL.includes('localhost') && !env.DATABASE_URL.includes('127.0.0.1');

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: isRemoteDb ? { rejectUnauthorized: false } : false,
});

/**
 * Ejecuta una operación dentro de una transacción ACID garantizada con rollback automático en caso de error.
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
