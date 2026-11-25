import { strict as assert } from 'node:assert';
const url = process.argv[2];
if (!url) throw new Error('Uso: npm run security:headers -- https://tu-dominio.vercel.app');
const response = await fetch(new URL('/health', url), { redirect: 'manual' });
const h = response.headers;
const checks = {
  'health status': response.status === 200,
  'content-security-policy': Boolean(h.get('content-security-policy')),
  'x-content-type-options': h.get('x-content-type-options') === 'nosniff',
  'referrer-policy': Boolean(h.get('referrer-policy')),
  'strict-transport-security': url.startsWith('https://') && Boolean(h.get('strict-transport-security')),
  'x-powered-by absent': !h.get('x-powered-by')
};
for (const [name, pass] of Object.entries(checks)) console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
assert(Object.values(checks).every(Boolean), 'Una o más comprobaciones de cabeceras fallaron');
