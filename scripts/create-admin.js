import 'dotenv/config';
import argon2 from 'argon2';
import { pool } from '../src/db.js';

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME?.trim() || 'Administrador';
if (!email || !password || password.length < 12) {
  console.error('Define ADMIN_EMAIL y una ADMIN_PASSWORD de al menos 12 caracteres en el entorno.');
  process.exit(1);
}
try {
  const hash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
  await pool.query(
    `INSERT INTO users (email, name, password_hash, role) VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO UPDATE SET role = 'admin', name = EXCLUDED.name, password_hash = EXCLUDED.password_hash`, [email, name, hash]
  );
  console.log(`Administrador configurado: ${email}`);
} finally { await pool.end(); }

