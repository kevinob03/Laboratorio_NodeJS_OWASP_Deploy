import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import argon2 from 'argon2';
import { z } from 'zod';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';
import { decrypt, encrypt, mask } from './crypto.js';
import { hitRateLimit, makeToken, safeEqual, sha256, writeEvent } from './security.js';
import { sendResetEmail } from './mail.js';

const logger = pino({ level: process.env.LOG_LEVEL || 'info', redact: ['req.headers.cookie', 'req.headers.authorization', 'res.headers.set-cookie'] });
const app = express();
const DUMMY_HASH = await argon2.hash('not-a-real-account-password', { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.set('views', fileURLToPath(new URL('./views', import.meta.url)));
if (!process.env.SESSION_SECRET || Buffer.byteLength(process.env.SESSION_SECRET) < 32) throw new Error('SESSION_SECRET debe tener al menos 32 bytes.');
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"], imgSrc: ["'self'", 'data:'], objectSrc: ["'none'"], baseUri: ["'self'"], frameAncestors: ["'none'"] } }, referrerPolicy: { policy: 'no-referrer' } }));
app.use(express.urlencoded({ extended: false, limit: '48kb' }));
app.use(express.static(fileURLToPath(new URL('../public', import.meta.url)), { maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0 }));
app.use(pinoHttp({ logger, serializers: { req: (req) => ({ id: req.id, method: req.method, url: String(req.url || '').split('?')[0], remoteAddress: req.remoteAddress }) } }));
app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
const PgSession = connectPgSimple(session);
app.use(session({
  store: new PgSession({ pool, tableName: 'user_sessions', createTableIfMissing: false, pruneSessionInterval: 15 }),
  name: 'securevault.sid', secret: process.env.SESSION_SECRET,
  resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 1000 * 60 * 30 }
}));
app.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

const setSession = (req, values) => new Promise((resolve, reject) => req.session.regenerate((err) => {
  if (err) return reject(err);
  Object.assign(req.session, values);
  req.session.save((saveError) => saveError ? reject(saveError) : resolve());
}));
const destroySession = (req) => new Promise((resolve, reject) => req.session.destroy((err) => err ? reject(err) : resolve()));
const csrfValue = () => makeToken();
app.use((req, res, next) => {
  if (!req.session.csrfToken) req.session.csrfToken = csrfValue();
  res.locals.csrfToken = req.session.csrfToken;
  res.locals.currentUser = req.session.user || null;
  res.locals.notice = req.query.notice || '';
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    if (!safeEqual(req.body?._csrf, req.session.csrfToken)) return res.status(403).render('error', { title: 'Solicitud rechazada', message: 'No se pudo validar el formulario.' });
  }
  next();
});

const emailSchema = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const passwordSchema = z.string().min(12).max(128).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/);
const signupSchema = z.object({ name: z.string().trim().min(1).max(100), email: emailSchema, password: passwordSchema });
const noteSchema = z.object({ title: z.string().trim().min(1).max(100), body: z.string().trim().min(1).max(10000) });
const profileSchema = z.object({ sensitive: z.string().trim().max(100).optional().default('') });

async function requireUser(req, res, next) {
  if (!req.session.user?.id) return res.redirect('/login');
  try {
    const { rows } = await pool.query('SELECT id, email, name, role FROM users WHERE id = $1', [req.session.user.id]);
    if (!rows[0]) { await destroySession(req); return res.redirect('/login'); }
    req.user = rows[0]; res.locals.currentUser = rows[0]; next();
  } catch (err) { next(err); }
}
async function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    try { await writeEvent('access_denied', req, { actor: req.user.id, details: { route: '/admin' } }); }
    catch (err) { return next(err); }
    return res.status(403).render('error', { title: 'Acceso denegado', message: 'No tienes permiso para ver esta pagina.' });
  }
  next();
}
const friendlyError = (res, message) => res.status(400).render('error', { title: 'Revisa los datos', message });

app.get('/', (req, res) => res.render('home'));
app.get('/register', (_req, res) => res.render('register', { error: '' }));
app.post('/register', async (req, res, next) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).render('register', { error: 'Usa un nombre y correo válidos. La contraseña requiere 12 caracteres, mayúscula, minúscula, número y símbolo.' });
  try {
    const hash = await argon2.hash(parsed.data.password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
    const { rows } = await pool.query('INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name, role', [parsed.data.name, parsed.data.email, hash]);
    await writeEvent('registration_success', req, { actor: rows[0].id });
    await setSession(req, { user: { id: rows[0].id, role: rows[0].role, name: rows[0].name, email: rows[0].email } });
    res.redirect('/notes');
  } catch (err) { if (err.code === '23505') return res.status(400).render('register', { error: 'No se pudo crear la cuenta con esos datos.' }); next(err); }
});
app.get('/login', (_req, res) => res.render('login', { error: '' }));
app.post('/login', async (req, res, next) => {
  try {
    const key = `login:${req.ip}`;
    if (!(await hitRateLimit(key, 5, 60))) {
      await writeEvent('login_rate_limited', req);
      res.set('Retry-After', '60'); return res.status(429).render('login', { error: 'Demasiados intentos. Espera un minuto y vuelve a probar.' });
    }
    const email = String(req.body.email || '').trim().toLowerCase();
    const { rows } = await pool.query('SELECT id, email, name, role, password_hash FROM users WHERE email = $1', [email]);
    const valid = await argon2.verify(rows[0]?.password_hash || DUMMY_HASH, String(req.body.password || '')).catch(() => false) && Boolean(rows[0]);
    if (!valid) {
      await writeEvent('login_failed', req, { details: { attempted_email_hash: sha256(email) } });
      return res.status(401).render('login', { error: 'Correo o contraseña incorrectos.' });
    }
    await writeEvent('login_success', req, { actor: rows[0].id });
    await setSession(req, { user: { id: rows[0].id, role: rows[0].role, name: rows[0].name, email: rows[0].email } });
    res.redirect('/notes');
  } catch (err) { next(err); }
});
app.post('/logout', requireUser, async (req, res, next) => {
  try { await writeEvent('logout', req, { actor: req.user.id }); await destroySession(req); res.clearCookie('securevault.sid'); res.redirect('/'); }
  catch (err) { next(err); }
});

app.get('/notes/:id', requireUser, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT id, title_enc, body_enc, created_at FROM notes WHERE id = $1 AND owner_id = $2', [req.params.id, req.user.id]);
    if (!rows[0]) { await writeEvent('access_denied', req, { actor: req.user.id, details: { resource: 'note', action: 'read' } }); return res.status(404).render('error', { title: 'Nota no encontrada', message: 'No se encontró una nota tuya con ese identificador.' }); }
    res.render('note', { note: { id: rows[0].id, title: decrypt(rows[0].title_enc), body: decrypt(rows[0].body_enc), createdAt: rows[0].created_at } });
  } catch (err) { next(err); }
});
app.get('/notes', requireUser, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT id, title_enc, body_enc, created_at FROM notes WHERE owner_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.render('notes', { notes: rows.map((n) => ({ id: n.id, title: decrypt(n.title_enc), body: decrypt(n.body_enc), createdAt: n.created_at })) });
  } catch (err) { next(err); }
});
app.post('/notes', requireUser, async (req, res, next) => {
  const parsed = noteSchema.safeParse(req.body);
  if (!parsed.success) return friendlyError(res, 'El t\u00edtulo debe tener hasta 100 caracteres y la nota hasta 10 000.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [req.user.id]);
    const { rows: count } = await client.query('SELECT count(*)::int AS total FROM notes WHERE owner_id = $1', [req.user.id]);
    if (count[0].total >= 100) { await client.query('ROLLBACK'); return friendlyError(res, 'Has alcanzado el l\u00edmite de 100 notas.'); }
    await client.query('INSERT INTO notes (owner_id, title_enc, body_enc) VALUES ($1, $2, $3)', [req.user.id, encrypt(parsed.data.title), encrypt(parsed.data.body)]);
    await client.query('COMMIT');
    await writeEvent('note_created', req, { actor: req.user.id }); res.redirect('/notes');
  } catch (err) { await client.query('ROLLBACK').catch(() => {}); next(err); }
  finally { client.release(); }
});
app.post('/notes/:id/update', requireUser, async (req, res, next) => {
  const parsed = noteSchema.safeParse(req.body);
  if (!parsed.success) return friendlyError(res, 'Revisa el título y el contenido de la nota.');
  try {
    const result = await pool.query('UPDATE notes SET title_enc = $1, body_enc = $2, updated_at = now() WHERE id = $3 AND owner_id = $4', [encrypt(parsed.data.title), encrypt(parsed.data.body), req.params.id, req.user.id]);
    if (!result.rowCount) { await writeEvent('access_denied', req, { actor: req.user.id, details: { resource: 'note', action: 'update' } }); return res.status(404).render('error', { title: 'Nota no encontrada', message: 'No se encontró una nota tuya con ese identificador.' }); }
    await writeEvent('note_updated', req, { actor: req.user.id }); res.redirect('/notes');
  } catch (err) { next(err); }
});
app.post('/notes/:id/delete', requireUser, async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM notes WHERE id = $1 AND owner_id = $2', [req.params.id, req.user.id]);
    if (!result.rowCount) { await writeEvent('access_denied', req, { actor: req.user.id, details: { resource: 'note', action: 'delete' } }); return res.status(404).render('error', { title: 'Nota no encontrada', message: 'No se encontró una nota tuya con ese identificador.' }); }
    await writeEvent('note_deleted', req, { actor: req.user.id }); res.redirect('/notes');
  } catch (err) { next(err); }
});
app.get('/profile', requireUser, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT sensitive_data_enc FROM users WHERE id = $1', [req.user.id]);
    const value = rows[0]?.sensitive_data_enc ? decrypt(rows[0].sensitive_data_enc) : '';
    res.render('profile', { masked: value ? mask(value) : 'No configurado', error: '' });
  } catch (err) { next(err); }
});
app.post('/profile', requireUser, async (req, res, next) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) return friendlyError(res, 'El dato sensible no puede superar 100 caracteres.');
  try {
    await pool.query('UPDATE users SET sensitive_data_enc = $1 WHERE id = $2', [parsed.data.sensitive ? encrypt(parsed.data.sensitive) : null, req.user.id]);
    await writeEvent('profile_sensitive_data_changed', req, { actor: req.user.id }); res.redirect('/profile');
  } catch (err) { next(err); }
});
app.get('/forgot-password', (_req, res) => res.render('forgot', { message: '' }));
app.post('/forgot-password', async (req, res, next) => {
  try {
    if (!(await hitRateLimit(`reset:${req.ip}`, 3, 600))) return res.status(429).render('forgot', { message: 'Espera unos minutos antes de solicitar otro enlace.' });
    const email = String(req.body.email || '').trim().toLowerCase();
    const { rows } = await pool.query('SELECT id, email FROM users WHERE email = $1', [email]);
    if (rows[0]) {
      const token = makeToken();
      await pool.query('INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, now() + interval \'15 minutes\')', [rows[0].id, sha256(token)]);
      const origin = process.env.APP_ORIGIN || process.env.RENDER_EXTERNAL_URL || `${req.protocol}://${req.get('host')}`;
      try { await sendResetEmail(rows[0].email, `${origin}/reset-password?token=${encodeURIComponent(token)}`); }
      catch (mailError) { logger.error({ event: 'reset_email_failed', message: mailError.message }); }
      await writeEvent('password_reset_requested', req, { actor: rows[0].id });
    }
    res.render('forgot', { message: 'Si el correo está registrado, recibirás instrucciones para recuperar la cuenta.' });
  } catch (err) { next(err); }
});
app.get('/reset-password', (req, res) => res.render('reset', { token: String(req.query.token || ''), error: '' }));
app.post('/reset-password', async (req, res, next) => {
  const token = String(req.body.token || ''); const parsed = passwordSchema.safeParse(req.body.password);
  if (!token || !parsed.success) return res.status(400).render('reset', { token, error: 'El enlace o la contraseña no son válidos. Usa una contraseña de 12 caracteres o más con mayúscula, minúscula, número y símbolo.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT id, user_id FROM password_resets WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now() FOR UPDATE', [sha256(token)]);
    if (!rows[0]) { await client.query('ROLLBACK'); return res.status(400).render('reset', { token: '', error: 'El enlace venció o ya fue utilizado.' }); }
    const hash = await argon2.hash(parsed.data, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
    await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, rows[0].user_id]);
    await client.query('UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL', [rows[0].user_id]);
    await client.query('DELETE FROM user_sessions WHERE sess::text LIKE $1', [`%${rows[0].user_id}%`]);
    await client.query('COMMIT');
    await writeEvent('password_reset_completed', req, { target: rows[0].user_id });
    res.redirect('/login?notice=Contraseña%20actualizada');
  } catch (err) { await client.query('ROLLBACK').catch(() => {}); next(err); }
  finally { client.release(); }
});
app.get('/admin', requireUser, requireAdmin, async (req, res, next) => {
  try {
    const [users, events] = await Promise.all([
      pool.query('SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC LIMIT 200'),
      pool.query('SELECT event_type, actor_user_id, target_user_id, ip_address, details, created_at FROM security_events ORDER BY created_at DESC LIMIT 100')
    ]);
    res.render('admin', { users: users.rows, events: events.rows });
  } catch (err) { next(err); }
});
app.post('/admin/users/:id/role', requireUser, requireAdmin, async (req, res, next) => {
  if (req.params.id === req.user.id) return friendlyError(res, 'No puedes cambiar tu propio rol.');
  const role = req.body.role === 'admin' ? 'admin' : 'user';
  try {
    const { rows } = await pool.query('UPDATE users SET role = $1 WHERE id = $2 RETURNING id', [role, req.params.id]);
    if (!rows[0]) return res.status(404).render('error', { title: 'Usuario no encontrado', message: 'No se encontró ese usuario.' });
    await writeEvent('role_changed', req, { actor: req.user.id, target: req.params.id, details: { new_role: role } }); res.redirect('/admin');
  } catch (err) { next(err); }
});
app.use((_req, res) => res.status(404).render('error', { title: 'Página no encontrada', message: 'No encontramos esa página.' }));
app.use((err, req, res, _next) => {
  logger.error({ event: 'request_error', requestId: req.id, message: err.message, stack: process.env.NODE_ENV === 'production' ? undefined : err.stack });
  if (res.headersSent) return;
  res.status(500).render('error', { title: 'Ocurrió un problema', message: 'No se pudo completar la solicitud. Inténtalo de nuevo.' });
});
process.on('unhandledRejection', (reason) => { logger.fatal({ event: 'unhandled_rejection', message: reason instanceof Error ? reason.message : 'unknown' }); process.exit(1); });

export default app;
if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'test') {
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => logger.info({ event: 'server_started', port }));
}




