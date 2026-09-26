import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanBody, parseSpace } from '../src/lib/spaces.ts';

test('direct room keys always include the signed-in participant', () => {
  assert.deepEqual(parseSpace('dm', 'Bob', 'Alice'), { scope: 'dm', target: 'alice:bob' });
  assert.deepEqual(parseSpace('dm', 'Alice', 'Bob'), { scope: 'dm', target: 'alice:bob' });
  assert.equal(parseSpace('dm', 'Bob'), null);
  assert.equal(parseSpace('dm', 'Alice', 'Alice'), null);
});

test('space targets and bodies reject invalid input', () => {
  assert.equal(parseSpace('repo', '../admin'), null);
  assert.deepEqual(parseSpace('repo', 'owner/repo'), { scope: 'repo', target: 'owner/repo' });
  assert.equal(cleanBody('  hello\r\nworld  ', 20), 'hello\nworld');
  assert.equal(cleanBody('x'.repeat(501), 500), '');
  assert.equal(cleanBody('<script>alert(1)</script>', 100), '<script>alert(1)</script>');
});
