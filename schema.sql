CREATE TABLE IF NOT EXISTS users (
  github_id TEXT PRIMARY KEY,
  github_login TEXT NOT NULL,
  avatar_url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS follows (
  user_id TEXT NOT NULL,
  github_login TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, github_login)
);
CREATE INDEX IF NOT EXISTS idx_follows_user ON follows(user_id, created_at DESC);
