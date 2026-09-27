export const contributionLanguages = ['TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'Java', 'C', 'C++', 'C#', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Dart', 'Shell'] as const;

export function contributionQuery(params: URLSearchParams, now = new Date()) {
  const language = params.get('language') || '';
  const kind = params.get('kind') || 'first';
  const repo = (params.get('repo') || '').trim();
  const words = (params.get('q') || '').trim();
  const days = params.get('days') || '90';
  const unassigned = params.get('unassigned') || '1';
  const page = Number(params.get('page') || '1');
  if (language && !contributionLanguages.includes(language as typeof contributionLanguages[number])) throw new Error('Choose a language from the list.');
  if (!['first', 'help', 'all'].includes(kind) || !['30', '90', '365'].includes(days) || !['0', '1'].includes(unassigned)) throw new Error('Choose valid issue filters.');
  if (!Number.isInteger(page) || page < 1 || page > 5) throw new Error('Choose a page from 1 to 5.');
  if (repo && !/^(?!-)[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?\/[\w.-]{1,100}$/i.test(repo)) throw new Error('Use owner/repository, such as microsoft/vscode.');
  if (words.length > 60 || (words && !/^[\p{L}\p{N}\s._-]+$/u.test(words))) throw new Error('Use up to 60 letters, numbers, spaces, dots or hyphens for keywords.');
  const since = new Date(now.getTime() - Number(days) * 86400000).toISOString().slice(0, 10);
  const parts = ['is:issue', 'is:open', 'is:public', 'archived:false', 'is:unlocked', `updated:>=${since}`];
  if (kind !== 'all') parts.push(`label:"${kind === 'first' ? 'good first issue' : 'help wanted'}"`);
  if (language) parts.push(`language:"${language}"`);
  if (repo) parts.push(`repo:${repo}`);
  if (unassigned === '1') parts.push('no:assignee');
  if (words) parts.push(...words.split(/\s+/).map(word => `"${word}"`));
  return { query: parts.join(' '), page };
}
