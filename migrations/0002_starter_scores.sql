-- Initial challengers, supplied by the portfolio owner. Stable IDs make
-- repeated application safe without overwriting visitor runs.
INSERT OR IGNORE INTO dino_scores (visitor_id, nickname, best_score, updated_at) VALUES
  ('starter-esha', 'esha', 164, unixepoch()),
  ('starter-rahul', 'Rahul', 238, unixepoch()),
  ('starter-h4xxor', 'h4xxor', 512, unixepoch()),
  ('starter-samuel', 'Samuel', 327, unixepoch());
