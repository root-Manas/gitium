import test from 'node:test';
import assert from 'node:assert/strict';
import { searchPeople } from '../src/lib/github.ts';
test('People opens with discoverable profiles and does not disguise failed requests as zero matches', async () => {
  const original=globalThis.fetch;const urls=[];
  globalThis.fetch=async url=>{urls.push(new URL(url));return Response.json({items:[{id:11,login:'alice'}],total_count:1,incomplete_results:false});};
  try {
    assert.equal((await searchPeople('')).users[0].login,'alice');
    assert.equal(urls[0].searchParams.get('q'),'type:user followers:>100');
    await searchPeople('alice');assert.equal(urls[1].searchParams.get('q'),'alice type:user');
    globalThis.fetch=async()=>Response.json({}, {status:429});
    await assert.rejects(searchPeople('alice'),/rate limit/);
  }finally{globalThis.fetch=original;}
});
