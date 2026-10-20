CREATE TABLE IF NOT EXISTS dino_scores (
  visitor_id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL CHECK (length(nickname) BETWEEN 1 AND 20),
  best_score INTEGER NOT NULL CHECK (best_score BETWEEN 1 AND 99999),
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS dino_ranking ON dino_scores(best_score DESC, updated_at ASC);
