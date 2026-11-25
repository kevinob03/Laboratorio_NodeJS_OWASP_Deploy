import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { pool } from './db.js';
export const sha256 = (value) => createHash('sha256').update(value).digest('hex');
export const makeToken = () => randomBytes(32).toString('base64url');
export function safeEqual(a = '', b = '') {
  const left = Buffer.from(String(a)); const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}
export async function writeEvent(eventType, req, { actor = null, target = null, details = {} } = {}) {
  await pool.query(
    `INSERT INTO security_events (event_type, actor_user_id, target_user_id, ip_address, details)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [eventType, actor, target, req.ip || null, JSON.stringify(details)]
  );
}
export async function hitRateLimit(key, limit, windowSeconds) {
  const { rows } = await pool.query(
    `INSERT INTO rate_limits (key, count, window_started_at) VALUES ($1, 1, now())
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN rate_limits.window_started_at < now() - ($3 * interval '1 second') THEN 1 ELSE rate_limits.count + 1 END,
       window_started_at = CASE WHEN rate_limits.window_started_at < now() - ($3 * interval '1 second') THEN now() ELSE rate_limits.window_started_at END
     RETURNING count`, [key, limit, windowSeconds]
  );
  return rows[0].count <= limit;
}
