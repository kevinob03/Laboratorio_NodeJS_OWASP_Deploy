import 'dotenv/config';
import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : undefined, max: 1, connectionTimeoutMillis: 5000, statement_timeout: 5000 });
try {
  await pool.query('SELECT 1');
  console.log('Conexión PostgreSQL correcta.');
} finally { await pool.end(); }
