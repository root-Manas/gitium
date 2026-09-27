import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateAccount } from '../src/lib/value.ts';

const now = new Date('2026-09-27T00:00:00Z');
test('account score rewards maintained work and applies visible deductions', () => {
  const healthy = estimateAccount(200, 20, [{ stargazers_count: 150, pushed_at: '2026-09-20T00:00:00Z', fork: false }], now);
  const stale = estimateAccount(200, 20, [{ stargazers_count: 150, pushed_at: '2020-01-01T00:00:00Z', fork: false }], now);
  assert.ok(healthy.value > stale.value);
  assert.equal(stale.deductions.noRecentWork, 300);
  assert.equal(stale.deductions.staleRepos, 45);
  assert.ok(healthy.deductions.oneHitWonder > 0);
});

test('forks do not credit copied stars and empty accounts do not go below zero', () => {
  const result = estimateAccount(0, 0, [{ stargazers_count: 9999, fork: true }], now);
  assert.equal(result.stars, 0);
  assert.equal(result.value, 0);
});
