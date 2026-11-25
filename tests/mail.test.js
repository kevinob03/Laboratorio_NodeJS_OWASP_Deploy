import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sendResetEmail } from '../src/mail.js';

test('password recovery uses the HTTPS mail API when configured', async () => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.RESEND_API_KEY;
  const previousFrom = process.env.MAIL_FROM;
  let request;
  process.env.RESEND_API_KEY = 'test-token';
  process.env.MAIL_FROM = 'SecureVault <no-reply@example.test>';
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200 };
  };
  try {
    await sendResetEmail('student@example.test', 'https://securevault.onrender.com/reset-password?token=demo');
    assert.equal(request.url, 'https://api.resend.com/emails');
    assert.equal(request.options.headers.authorization, 'Bearer test-token');
    assert.equal(JSON.parse(request.options.body).to[0], 'student@example.test');
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = previousKey;
    if (previousFrom === undefined) delete process.env.MAIL_FROM; else process.env.MAIL_FROM = previousFrom;
  }
});

test('mail API errors do not include secret keys in error messages', async () => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.RESEND_API_KEY;
  const previousFrom = process.env.MAIL_FROM;
  process.env.RESEND_API_KEY = 'never-log-this-secret';
  process.env.MAIL_FROM = 'SecureVault <no-reply@example.test>';
  globalThis.fetch = async () => ({ ok: false, status: 403 });
  try {
    await assert.rejects(sendResetEmail('student@example.test', 'https://example.test/reset'), (error) => {
      assert.match(error.message, /403/);
      assert.equal(error.message.includes('never-log-this-secret'), false);
      return true;
    });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = previousKey;
    if (previousFrom === undefined) delete process.env.MAIL_FROM; else process.env.MAIL_FROM = previousFrom;
  }
});
