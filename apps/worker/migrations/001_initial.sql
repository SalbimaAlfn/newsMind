-- Sources table for configured RSS/Atom feeds
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE
);

-- Articles table for ingested content
CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  published TEXT,
  excerpt TEXT NOT NULL,
  collected_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
  UNIQUE(source_id, url)
);

-- Collection runs tracking
CREATE TABLE IF NOT EXISTS collection_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
  status TEXT NOT NULL DEFAULT 'ok',
  articles_count INTEGER NOT NULL DEFAULT 0
);
