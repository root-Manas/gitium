import test from 'node:test';
import assert from 'node:assert/strict';
import { githubGet, githubPublicGet, GitHubError } from '../src/lib/github.ts';

test('expired GitHub tokens only retry anonymously for explicitly public lookups', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return options.headers.Authorization ? Response.json({ message: 'Bad credentials' }, { status: 401 }) : Response.json({ items: [{ id: 123 }] });
  };
  try {
    assert.deepEqual(await githubPublicGet('/search/issues?q=is%3Apublic', 300, 'expired-test-token'), { items: [{ id: 123 }] });
    assert.equal(calls.length, 2);
    assert.equal(calls[0].options.cache, 'no-store');
    assert.equal(calls[1].options.headers.Authorization, undefined);
    assert.equal(calls[1].options.next.revalidate, 300);
    calls.length = 0;
    await assert.rejects(githubGet('/user/starred', 0, 'expired-test-token'), error => error instanceof GitHubError && error.status === 401 && error.message.includes('Reconnect GitHub'));
    assert.equal(calls.length, 1, 'private calls never retry anonymously');
    globalThis.fetch = async () => Response.json({}, { status: 429, headers: { 'Retry-After': '120' } });
    await assert.rejects(githubPublicGet('/search/issues?q=is%3Apublic', 300, 'valid-test-token'), error => error instanceof GitHubError && error.status === 429 && error.retryAfter === 120);
  } finally { globalThis.fetch = original; }
});
