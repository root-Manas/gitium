export const exploreLanguages = ['TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'Java', 'C', 'C++', 'C#', 'Shell', 'Ruby', 'Swift', 'Kotlin'];
export const exploreTopics = ['developer-tools', 'self-hosted', 'security', 'machine-learning', 'web', 'database', 'devops', 'education'];
export function exploreQuery(params: URLSearchParams, now = new Date()) {
  const view = params.get('view') || 'projects';
  const q = (params.get('q') || '').trim();
  const language = params.get('language') || '';
  const topic = params.get('topic') || '';
  const owner = (params.get('owner') || '').trim();
  const sort = params.get('sort') || (view === 'orgs' ? 'followers' : 'stars');
  const period = params.get('period') || 'all';
  const page = Number(params.get('page') || 1);
  if (!['projects', 'orgs', 'essentials'].includes(view) || q.length > 60 || !/^[\p{L}\p{N}\s._-]*$/u.test(q) || (language && !exploreLanguages.includes(language)) || (topic && !exploreTopics.includes(topic)) || (owner && !/^[a-z\d][a-z\d-]{0,38}$/i.test(owner)) || !['all', '30', '365'].includes(period) || !Number.isInteger(page) || page < 1 || page > 5 || !(view === 'orgs' ? ['followers', 'repositories'] : ['stars', 'forks', 'updated']).includes(sort)) throw new Error('Choose valid search filters. Keywords can contain letters, numbers, spaces, dots, hyphens and underscores.');
  const words = q.split(/\s+/).filter(Boolean).map(word => `"${word}"`).join(' ');
  const parts = view === 'orgs' ? ['type:org', 'repos:>0'] : ['is:public', 'archived:false', 'fork:false', 'stars:>0'];
  if (words) parts.push(words);
  if (view !== 'orgs') {
    if (language) parts.push(`language:"${language}"`);
    if (topic) parts.push(`topic:${topic}`);
    if (owner) parts.push(`user:${owner}`);
    if (period !== 'all') parts.push(`created:>=${new Date(now.getTime() - Number(period) * 86400000).toISOString().slice(0, 10)}`);
  }
  return { view, q, language, topic, owner, sort, period, page, query: parts.join(' ') };
}

// Editorial selections, not an automated ranking or a security endorsement.
export const essentials = [
  { repo: 'cli/cli', category: 'Developer tools', text: 'Manage pull requests, issues and releases from a terminal. Useful when you already spend your day in Git.', caveat: 'Requires a GitHub account for account actions.' },
  { repo: 'jqlang/jq', category: 'Developer tools', text: 'Filter and reshape JSON without writing a separate program. Handy for API responses and shell scripts.', caveat: 'Its query syntax takes some practice.' },
  { repo: 'BurntSushi/ripgrep', category: 'Developer tools', text: 'Search large codebases quickly, with sensible defaults for ignored and hidden files.', caveat: 'Ignored files need explicit flags when you want to search them.' },
  { repo: 'syncthing/syncthing', category: 'Self hosting', text: 'Keep folders in sync between your own devices without choosing a central storage provider.', caveat: 'Sync is not a backup; deletions can propagate.' },
  { repo: 'restic/restic', category: 'Self hosting', text: 'Make encrypted, incremental backups to local disks or remote storage.', caveat: 'Keep the backup password safe and test restores.' },
  { repo: 'caddyserver/caddy', category: 'Infrastructure', text: 'Serve sites and reverse proxy applications with automatic HTTPS for supported setups.', caveat: 'Public certificates still need valid DNS and reachable challenge endpoints.' },
  { repo: 'prometheus/prometheus', category: 'Infrastructure', text: 'Collect time-series metrics and query them to understand what your services are doing.', caveat: 'Retention and label cardinality affect storage and memory.' },
  { repo: 'OWASP/CheatSheetSeries', category: 'Security', text: 'Practical security guidance for authentication, sessions, input handling and other common application decisions.', caveat: 'Guidance still needs to be applied to your own threat model.' },
  { repo: 'ossu/computer-science', category: 'Learning', text: 'A structured route through computer science courses for people studying independently.', caveat: 'A full curriculum takes sustained work; course access can vary.' }
];
