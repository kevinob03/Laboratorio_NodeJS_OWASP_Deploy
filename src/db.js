import pg from 'pg';
const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL');
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : undefined,
  max: process.env.NODE_ENV === 'production' ? 1 : 5,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10000,
  statement_timeout: 5000,
  query_timeout: 7000
});
pool.on('error', (err) => console.error(JSON.stringify({ level: 'error', event: 'db_pool_error', message: err.message })));
