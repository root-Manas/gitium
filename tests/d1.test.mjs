import test from 'node:test';
import assert from 'node:assert/strict';
import { queryD1 } from '../src/lib/d1.ts';

test('D1 query sends bound parameters to Cloudflare and returns rows', async () => {
  const previous = { account: process.env.CF_ACCOUNT_ID, database: process.env.CF_D1_DATABASE_ID, token: process.env.CF_D1_API_TOKEN, fetch: globalThis.fetch };
  process.env.CF_ACCOUNT_ID = 'account';
  process.env.CF_D1_DATABASE_ID = 'database';
  process.env.CF_D1_API_TOKEN = 'test-secret';
  let seen;
  globalThis.fetch = async (url, options) => {
    seen = { url, options };
    return { ok: true, json: async () => ({ success: true, result: [{ success: true, results: [{ github_login: 'manas' }] }] }) };
  };
  try {
    const rows = await queryD1('SELECT github_login FROM follows WHERE user_id=?', ['123']);
    assert.deepEqual(rows, [{ github_login: 'manas' }]);
    assert.match(seen.url, /accounts\/account\/d1\/database\/database\/query$/);
    assert.equal(JSON.parse(seen.options.body).params[0], '123');
    assert.equal(seen.options.headers.Authorization, 'Bearer test-secret');
    assert.equal(seen.options.cache, 'no-store');
  } finally {
    for (const [key, value] of [['CF_ACCOUNT_ID', previous.account], ['CF_D1_DATABASE_ID', previous.database], ['CF_D1_API_TOKEN', previous.token]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    globalThis.fetch = previous.fetch;
  }
});
