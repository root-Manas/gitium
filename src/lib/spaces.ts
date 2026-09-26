const validLogin = (value: string) => /^(?!-)[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(value);

export type SpaceKind = 'user' | 'repo' | 'org' | 'dm';
export type SpaceItem = { id: string; scope: SpaceKind; target: string; author_login: string; body: string; created_at: string };

export function parseSpace(scope: string | null, target: string | null, self = '') {
  const kind = String(scope || '').toLowerCase();
  const name = String(target || '').trim().toLowerCase();
  if (kind === 'repo' && /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?\/[a-z\d_.-]{1,100}$/i.test(name) && !name.includes('..')) return { scope: kind as SpaceKind, target: name };
  if (['user', 'org'].includes(kind) && validLogin(name)) return { scope: kind as SpaceKind, target: name };
  if (kind === 'dm' && self && validLogin(name) && name !== self.toLowerCase()) return { scope: kind as SpaceKind, target: [self.toLowerCase(), name].sort().join(':') };
  return null;
}

export function cleanBody(input: unknown, limit: number) {
  if (typeof input !== 'string') return '';
  const body = input.trim().replace(/\r\n?/g, '\n');
  return body.length >= 1 && body.length <= limit && !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(body) ? body : '';
}
