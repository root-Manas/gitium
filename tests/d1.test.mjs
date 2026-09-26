import test from 'node:test';
import assert from 'node:assert/strict';
import { queryD1 } from '../src/lib/d1.ts';

test('D1 query sends bound parameters to Cloudflare and returns rows', async () => {
  const previous = { url: process.env.CF_D1_WORKER_URL, token: process.env.CF_D1_SERVICE_TOKEN, fetch: globalThis.fetch };
  process.env.CF_D1_WORKER_URL = 'https://gitium-data.example.workers.dev';
  process.env.CF_D1_SERVICE_TOKEN = 'test-secret';
  let seen;
  globalThis.fetch = async (url, options) => {
    seen = { url, options };
    return { ok: true, json: async () => ({ success: true, result: [{ success: true, results: [{ github_login: 'manas' }] }] }) };
  };
  try {
    const rows = await queryD1('SELECT github_login FROM follows WHERE user_id=?', ['123']);
    assert.deepEqual(rows, [{ github_login: 'manas' }]);
    assert.equal(seen.url, 'https://gitium-data.example.workers.dev/query');
    assert.equal(JSON.parse(seen.options.body).params[0], '123');
    assert.equal(seen.options.headers.Authorization, 'Bearer test-secret');
    assert.equal(seen.options.cache, 'no-store');
  } finally {
    for (const [key, value] of [['CF_D1_WORKER_URL', previous.url], ['CF_D1_SERVICE_TOKEN', previous.token]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    globalThis.fetch = previous.fetch;
  }
});

test('Worker rejects requests without the service secret and executes bound queries', async () => {
  const worker = (await import('../worker/index.js')).default;
  let recorded;
  const env = { SERVICE_TOKEN: 'test-secret', DB: { prepare(sql) { return { bind(...params) { recorded = { sql, params }; return { run: async () => ({ success: true, results: [{ github_login: 'manas' }] }) }; } }; } } };
  const url = 'https://gitium-data.example.workers.dev/query';
  const body = JSON.stringify({ sql: 'SELECT github_login FROM follows WHERE user_id=?', params: ['123'] });
  const unauthorized = await worker.fetch(new Request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }), env);
  assert.equal(unauthorized.status, 401);
  const authorized = await worker.fetch(new Request(url, { method: 'POST', headers: { Authorization: 'Bearer test-secret', 'Content-Type': 'application/json' }, body }), env);
  assert.equal(authorized.status, 200);
  assert.deepEqual(recorded.params, ['123']);
  assert.deepEqual((await authorized.json()).result[0].results, [{ github_login: 'manas' }]);
});
