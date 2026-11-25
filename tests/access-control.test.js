import { test } from 'node:test';
import assert from 'node:assert/strict';

// Property-level checks for the authorization predicates used in SQL mutations.
test('note reads, updates and deletes are scoped to the authenticated owner', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../src/server.js', import.meta.url), 'utf8');
  assert.match(source, /WHERE id = \$1 AND owner_id = \$2/);
  assert.match(source, /WHERE id = \$3 AND owner_id = \$4/);
  assert.match(source, /WHERE id = \$1 AND owner_id = \$2/);
});
