import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
test('essential catalog contains over 500 distinct GitHub projects with provenance', () => {
  const catalog=JSON.parse(readFileSync(new URL('../public/catalog/essentials.json',import.meta.url),'utf8'));
  assert.ok(catalog.projects.length>500);
  assert.equal(new Set(catalog.projects.map(item=>item.repo.toLowerCase())).size,catalog.projects.length);
  assert.ok(new Set(catalog.projects.map(item=>item.category)).size>30);
  for(const item of catalog.projects){assert.match(item.repo,/^[\w.-]+\/[\w.-]+$/);assert.ok(item.description.length>=12);assert.equal(item.source,'awesome-selfhosted');}
  assert.equal(catalog.license,'CC-BY-SA-3.0');
});
