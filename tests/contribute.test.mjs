import test from 'node:test';
import assert from 'node:assert/strict';
import { contributionQuery } from '../src/lib/contribute.ts';

test('contribution search always restricts results to public open issues', () => {
  const result = contributionQuery(new URLSearchParams('language=C%2B%2B&kind=help&repo=owner/repo&page=2'), new Date('2026-09-27T00:00:00Z'));
  assert.equal(result.page, 2);
  for (const filter of ['is:issue', 'is:open', 'is:public', 'archived:false', 'no:assignee', 'language:"C++"', 'label:"help wanted"', 'repo:owner/repo', 'updated:>=2026-06-29']) assert.ok(result.query.includes(filter), filter);
});
test('contribution search rejects query operators and unbounded pagination', () => {
  for (const query of ['q=is%3Aprivate', 'repo=owner/repo+is%3Aprivate', 'page=99', 'kind=unknown', 'language=unknown', 'days=0']) assert.throws(() => contributionQuery(new URLSearchParams(query)));
  assert.ok(contributionQuery(new URLSearchParams('q=OR+accessibility')).query.endsWith('"OR" "accessibility"'));
});
