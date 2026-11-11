export const SCHEMA_VERSION = 2;

export const MIGRATION_SQL_V1 = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY NOT NULL,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS children (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL,
  preferred_language TEXT NOT NULL DEFAULT 'en',
  stars_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS letters (
  id TEXT PRIMARY KEY NOT NULL,
  language TEXT NOT NULL,
  character TEXT NOT NULL,
  lowercase_character TEXT,
  isolated_form TEXT,
  initial_form TEXT,
  medial_form TEXT,
  final_form TEXT,
  example_word TEXT NOT NULL,
  pronunciation_asset TEXT NOT NULL,
  illustration_asset TEXT NOT NULL,
  difficulty_level INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS letter_strokes (
  id TEXT PRIMARY KEY NOT NULL,
  letter_id TEXT NOT NULL,
  form_key TEXT NOT NULL,
  stroke_number INTEGER NOT NULL,
  normalized_path TEXT NOT NULL,
  start_point TEXT NOT NULL,
  end_point TEXT NOT NULL,
  direction TEXT NOT NULL,
  FOREIGN KEY (letter_id) REFERENCES letters(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_letter_strokes_letter_form
  ON letter_strokes(letter_id, form_key);

CREATE TABLE IF NOT EXISTS learning_progress (
  id TEXT PRIMARY KEY NOT NULL,
  child_id TEXT NOT NULL,
  letter_id TEXT NOT NULL,
  recognition_score INTEGER NOT NULL DEFAULT 0,
  tracing_score INTEGER NOT NULL DEFAULT 0,
  independent_writing_score INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  successful_attempts INTEGER NOT NULL DEFAULT 0,
  mastery_status TEXT NOT NULL DEFAULT 'new',
  last_practiced TEXT,
  UNIQUE(child_id, letter_id),
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
  FOREIGN KEY (letter_id) REFERENCES letters(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_learning_progress_child
  ON learning_progress(child_id);

CREATE TABLE IF NOT EXISTS practice_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  child_id TEXT NOT NULL,
  language TEXT NOT NULL,
  session_date TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_practice_sessions_child
  ON practice_sessions(child_id, session_date);

CREATE TABLE IF NOT EXISTS practice_attempts (
  id TEXT PRIMARY KEY NOT NULL,
  child_id TEXT NOT NULL,
  letter_id TEXT NOT NULL,
  form_key TEXT NOT NULL,
  mode TEXT NOT NULL,
  metrics_json TEXT NOT NULL,
  scoring_version TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
  FOREIGN KEY (letter_id) REFERENCES letters(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_practice_attempts_child_letter
  ON practice_attempts(child_id, letter_id);

CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY NOT NULL,
  child_id TEXT NOT NULL,
  achievement_type TEXT NOT NULL,
  achieved_at TEXT NOT NULL,
  UNIQUE(child_id, achievement_type),
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_achievements_child
  ON achievements(child_id);

CREATE TABLE IF NOT EXISTS parent_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  pin_hash_or_secure_representation TEXT NOT NULL,
  pin_hint_shown INTEGER NOT NULL DEFAULT 0,
  daily_goal_minutes INTEGER NOT NULL DEFAULT 10,
  daily_goal_letters INTEGER NOT NULL DEFAULT 3,
  audio_enabled INTEGER NOT NULL DEFAULT 1,
  narration_enabled INTEGER NOT NULL DEFAULT 1,
  sound_effects_volume REAL NOT NULL DEFAULT 0.85
);
`;

/**
 * Forward-only Schema Migration v2 (WP8):
 * Adds guided_mode & explore_mode to parent_settings, and needs_help & consecutive_fails
 * to learning_progress without dropping or resetting existing user data.
 */
export const MIGRATION_SQL_V2_STATEMENTS: string[] = [
  `ALTER TABLE parent_settings ADD COLUMN guided_mode INTEGER NOT NULL DEFAULT 1;`,
  `ALTER TABLE parent_settings ADD COLUMN explore_mode INTEGER NOT NULL DEFAULT 0;`,
  `ALTER TABLE learning_progress ADD COLUMN needs_help INTEGER NOT NULL DEFAULT 0;`,
  `ALTER TABLE learning_progress ADD COLUMN consecutive_fails INTEGER NOT NULL DEFAULT 0;`,
];

export const MIGRATION_SQL_V2 = MIGRATION_SQL_V2_STATEMENTS.join('\n');
