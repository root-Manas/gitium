import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeEvent, rankRecommendations, validLogin } from '../src/lib/github.ts';

const base = {
  id: '123456789', public: true, type: 'PullRequestEvent', created_at: '2026-09-27T10:00:00Z',
  actor: { login: 'manas', avatar_url: 'https://avatars.githubusercontent.com/u/1' },
  repo: { name: 'owner/repository' },
  payload: { action: 'opened', pull_request: { number: 42, title: 'Fix parsing', html_url: 'https://github.com/owner/repository/pull/42' } }
};

test('normalizes a GitHub event into a safe feed item', () => {
  const event = normalizeEvent(base);
  assert.equal(event.actor, 'manas');
  assert.equal(event.detail, 'Fix parsing');
  assert.equal(event.url, 'https://github.com/owner/repository/pull/42');
  assert.equal(event.isPrivate, false);
  assert.equal(normalizeEvent({ ...base, public: false }), null);
  assert.equal(normalizeEvent({ ...base, public: false }, true)?.isPrivate, true);
  assert.equal(normalizeEvent({ ...base, payload: { ...base.payload, pull_request: { ...base.payload.pull_request, html_url: 'https://bad.example/' } } })?.url, 'https://github.com/owner/repository');
});

test('validates GitHub logins and keeps the D1 schema to Gitium-owned data', () => {
  assert.equal(validLogin('root-Manas'), true);
  assert.equal(validLogin('../admin'), false);
  const schema = fs.readFileSync(new URL('../schema.sql', import.meta.url), 'utf8');
  assert.deepEqual([...schema.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/g)].map(match => match[1]), ['users', 'follows', 'posts', 'messages', 'rooms', 'room_members', 'room_invites', 'room_invitations', 'code_run_views', 'code_run_totals', 'account_runs']);
});

test('recommends overlap from followed people and excludes projects already starred by the user', () => {
  const repo = (id, stars, owner = 'other') => ({ id, full_name: `${owner}/repo-${id}`, description: null, html_url: `https://github.com/${owner}/repo-${id}`, language: 'TypeScript', stargazers_count: stars, forks_count: 0, owner: { login: owner, avatar_url: '' } });
  const ranked = rankRecommendations([
    { login: 'alice', repos: [repo(1, 500), repo(2, 5), repo(3, 50, 'alice')] },
    { login: 'bob', repos: [repo(1, 500), repo(4, 20)] },
    { login: 'carol', repos: [repo(1, 500), repo(2, 5)] }
  ], new Set([4]));
  assert.deepEqual(ranked.map(item => item.repo.id), [1, 2]);
  assert.deepEqual(ranked[0].starredBy, ['alice', 'bob', 'carol']);
});
