// Isolated UI/API regression fixture. Never imported by production code.
const original = globalThis.fetch;
const repo = { id: 1, full_name: 'alice/project', description: 'A test repository', private: false, default_branch: 'main', html_url: 'https://github.com/alice/project', language: 'TypeScript', stargazers_count: 100, forks_count: 3, owner: { login: 'alice', avatar_url: '' } };
globalThis.fetch = async (input, options) => {
  const url = new URL(String(input?.url || input));
  if (url.origin !== 'https://api.github.com') return original(input, options);
  if (options?.headers?.Authorization === 'Bearer expired-test-token') return Response.json({ message: 'Bad credentials' }, { status: 401 });
  if (url.pathname === '/search/issues') return Response.json({ total_count: 1, incomplete_results: false, items: [{ id: 9, number: 9, title: 'Improve keyboard navigation', body: 'Make the menu accessible.', html_url: 'https://github.com/alice/project/issues/9', comments: 2, updated_at: '2026-09-26T10:00:00Z', labels: [{ name: 'good first issue' }], assignees: [] }] });
  if (url.pathname === '/search/repositories') return Response.json({ total_count: 1, incomplete_results: false, items: [repo] });
  if (url.pathname === '/search/users') return Response.json({ total_count: 1, incomplete_results: false, items: [{ id: 11, login: 'alice', avatar_url: '', html_url: 'https://github.com/alice' }] });
  if (url.pathname.includes('/commits')) return Response.json([{ sha: 'a'.repeat(40), html_url: 'https://github.com/alice/project/commit/' + 'a'.repeat(40), author: { login: 'alice' }, commit: { author: { name: 'Alice', date: new Date().toISOString() }, message: 'Improve navigation' } }]);
  if (url.pathname.startsWith('/repos/')) return Response.json(repo);
  return Response.json([]);
};
