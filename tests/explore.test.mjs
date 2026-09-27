import test from 'node:test';
import assert from 'node:assert/strict';
import { exploreQuery } from '../src/lib/explore.ts';
test('discovery rankings keep public scope and describe creation windows', () => {
  const search = exploreQuery(new URLSearchParams('owner=microsoft&language=TypeScript&period=30'), new Date('2026-09-27T00:00:00Z'));
  assert.equal(search.sort, 'stars');
  for (const part of ['is:public', 'archived:false', 'fork:false', 'user:microsoft', 'created:>=2026-08-28']) assert.ok(search.query.includes(part));
  assert.equal(exploreQuery(new URLSearchParams('view=orgs')).query, 'type:org repos:>0');
  assert.equal(exploreQuery(new URLSearchParams('view=orgs')).sort, 'followers');
  assert.ok(exploreQuery(new URLSearchParams('q=https://github.com/microsoft/vscode.git')).query.includes('repo:microsoft/vscode'));
});
test('discovery rejects qualifier injection and excessive pagination', () => {
  for (const query of ['q=is:private', 'owner=x+is:private', 'view=people', 'sort=nonsense', 'page=6', 'period=2']) assert.throws(() => exploreQuery(new URLSearchParams(query)));
  assert.ok(exploreQuery(new URLSearchParams('q=OR+terminal')).query.endsWith('"OR" "terminal"'));
});
