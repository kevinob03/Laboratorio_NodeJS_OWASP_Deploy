import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
process.env.DATA_ENCRYPTION_KEY = randomBytes(32).toString('base64');
process.env.DATABASE_URL = 'postgresql://localhost:5432/securevault_test';
process.env.DATABASE_URL = 'postgresql://localhost:5432/securevault_test';
const { encrypt, decrypt, mask } = await import('../src/crypto.js');
const { safeEqual, sha256, makeToken } = await import('../src/security.js');

test('AES-256-GCM encrypts and decrypts note text', () => {
  const ciphertext = encrypt('nota privada');
  assert.notEqual(ciphertext, 'nota privada');
  assert.equal(decrypt(ciphertext), 'nota privada');
});

test('AES-GCM detects a modified ciphertext', () => {
  const encrypted = encrypt('no alterar');
  const chunks = encrypted.split('.');
  chunks[3] = Buffer.from('alterado').toString('base64');
  assert.throws(() => decrypt(chunks.join('.')));
});

test('each encryption uses a fresh IV', () => {
  const first = encrypt('igual'); const second = encrypt('igual');
  assert.notEqual(first.split('.')[1], second.split('.')[1]);
});

test('recovery tokens are random, long and URL-safe', () => {
  const first = makeToken(); const second = makeToken();
  assert.equal(first.length, 43); assert.notEqual(first, second); assert.match(first, /^[A-Za-z0-9_-]+$/);
  assert.equal(sha256(first).length, 64);
});

test('safeEqual handles equal and unequal strings without throwing', () => {
  assert.equal(safeEqual('abc', 'abc'), true); assert.equal(safeEqual('abc', 'abd'), false); assert.equal(safeEqual('a', 'long'), false);
});

test('sensitive profile value is masked', () => {
  assert.equal(mask('50688123456'), '*******3456');
});

