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

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  target TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_login TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_posts_space ON posts(scope, target, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id, created_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  target TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_login TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(scope, target, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_author ON messages(author_id, created_at DESC);

CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  target TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  owner_login TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_rooms_owner ON rooms(owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS room_members (
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  login TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(room_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_room_members_user ON room_members(user_id, joined_at DESC);

CREATE TABLE IF NOT EXISTS room_invites (
  room_id TEXT NOT NULL,
  login TEXT NOT NULL,
  invited_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(room_id, login)
);
CREATE INDEX IF NOT EXISTS idx_room_invites_login ON room_invites(login, created_at DESC);

-- Invitations bind to permanent GitHub IDs. Legacy username invitations are never accepted.
CREATE TABLE IF NOT EXISTS room_invitations (
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  login TEXT NOT NULL,
  invited_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(room_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_room_invitations_user ON room_invitations(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS code_run_views (
  user_id TEXT NOT NULL,
  repo TEXT NOT NULL,
  day TEXT NOT NULL,
  PRIMARY KEY(user_id, repo, day)
);
CREATE INDEX IF NOT EXISTS idx_code_run_views_user_day ON code_run_views(user_id, day);

CREATE TABLE IF NOT EXISTS code_run_totals (
  day TEXT NOT NULL,
  repo TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(day, repo)
);
CREATE INDEX IF NOT EXISTS idx_code_run_totals_day ON code_run_totals(day);

CREATE TABLE IF NOT EXISTS account_runs (
  day TEXT NOT NULL,
  login TEXT NOT NULL,
  value_usd INTEGER NOT NULL,
  PRIMARY KEY(day, login)
);
CREATE INDEX IF NOT EXISTS idx_account_runs_day ON account_runs(day, value_usd DESC);

CREATE TABLE IF NOT EXISTS dm_requests (
  pair TEXT PRIMARY KEY,
  requester_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined','cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK(requester_id <> recipient_id)
);
CREATE INDEX IF NOT EXISTS idx_dm_requester ON dm_requests(requester_id, created_at);
CREATE INDEX IF NOT EXISTS idx_dm_recipient ON dm_requests(recipient_id, status);
CREATE TABLE IF NOT EXISTS chat_blocks (
  blocker_id TEXT NOT NULL,
  blocked_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(blocker_id, blocked_id),
  CHECK(blocker_id <> blocked_id)
);
CREATE VIEW IF NOT EXISTS dm_allowed AS
SELECT pair FROM dm_requests d WHERE status='accepted' AND NOT EXISTS(
  SELECT 1 FROM chat_blocks b WHERE (b.blocker_id=d.requester_id AND b.blocked_id=d.recipient_id)
  OR (b.blocker_id=d.recipient_id AND b.blocked_id=d.requester_id)
);

CREATE TABLE IF NOT EXISTS room_declines (
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  PRIMARY KEY(room_id, user_id)
);
