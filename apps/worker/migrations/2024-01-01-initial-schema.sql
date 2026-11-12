-- Initial schema for NewsMind
-- Create sources table
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  feed_url TEXT NOT NULL,
  category TEXT,
  enabled INTEGER DEFAULT 1,
  last_checked_at TEXT,
  last_success_at TEXT,
  etag TEXT,
  last_modified TEXT,
  last_error TEXT
);

-- Create articles table
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES sources(id),
  guid TEXT,
  canonical_url TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  author TEXT,
  published_at TEXT,
  collected_at TEXT NOT NULL,
  last_seen_at TEXT,
  topic TEXT,
  relevance_score INTEGER,
  importance_score INTEGER,
  ai_summary TEXT,
  why_it_matters TEXT,
  analysis_status TEXT DEFAULT 'pending',
  is_read INTEGER DEFAULT 0,
  is_saved INTEGER DEFAULT 0
);

-- Create collection_runs table
CREATE TABLE IF NOT EXISTS collection_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL,
  feeds_attempted INTEGER DEFAULT 0,
  feeds_succeeded INTEGER DEFAULT 0,
  new_articles INTEGER DEFAULT 0,
  duplicates INTEGER DEFAULT 0,
  error_summary TEXT
);

-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_success_at TEXT,
  last_error_at TEXT,
  active INTEGER DEFAULT 1
);

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT NOT NULL
);

-- Create indexes for pagination and search
CREATE INDEX IF NOT EXISTS idx_articles_canonical_url ON articles(canonical_url);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);
CREATE INDEX IF NOT EXISTS idx_articles_topic ON articles(topic);
CREATE INDEX IF NOT EXISTS idx_articles_is_read ON articles(is_read);
CREATE INDEX IF NOT EXISTS idx_articles_is_saved ON articles(is_saved);
CREATE INDEX IF NOT EXISTS idx_sources_enabled ON sources(enabled);