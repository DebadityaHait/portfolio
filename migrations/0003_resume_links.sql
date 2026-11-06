CREATE TABLE IF NOT EXISTS resume_names (slug TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK (kind IN ('variant','link')), active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS resume_links (slug TEXT PRIMARY KEY REFERENCES resume_names(slug), variant TEXT NOT NULL REFERENCES resume_names(slug), revision INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS resume_links_variant ON resume_links(variant);
CREATE TABLE IF NOT EXISTS resume_agent_tokens (id TEXT PRIMARY KEY, name TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL DEFAULT (datetime('now')));
INSERT OR IGNORE INTO resume_names (slug, kind) VALUES ('general','variant'),('sde','variant'),('ai','variant'),('list','variant'),('visibility','variant'),('swe','variant');
