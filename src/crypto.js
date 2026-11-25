import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
const key = Buffer.from(process.env.DATA_ENCRYPTION_KEY || '', 'base64');
if (key.length !== 32) throw new Error('DATA_ENCRYPTION_KEY debe ser una llave base64 de 32 bytes.');
export function encrypt(plain) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return `v1.${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${data.toString('base64')}`;
}
export function decrypt(payload) {
  const [version, iv64, tag64, data64] = String(payload).split('.');
  if (version !== 'v1' || !iv64 || !tag64 || data64 === undefined) throw new Error('Formato cifrado inválido');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv64, 'base64'));
  decipher.setAuthTag(Buffer.from(tag64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(data64, 'base64')), decipher.final()]).toString('utf8');
}
export function mask(value) { return value.length <= 4 ? '****' : `${'*'.repeat(Math.max(4, value.length - 4))}${value.slice(-4)}`; }
