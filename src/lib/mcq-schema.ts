export const QUESTIONS_TABLE_SQL = `CREATE TABLE questions (
  qid TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  question TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);`;

export const CHOICES_TABLE_SQL = `CREATE TABLE choices (
  choiceid TEXT PRIMARY KEY,
  qid TEXT NOT NULL,
  choice_text TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL,
  FOREIGN KEY (qid) REFERENCES questions(qid) ON DELETE CASCADE
);`;

export const ATTEMPTS_TABLE_SQL = `CREATE TABLE attempts (
  attemptid TEXT PRIMARY KEY,
  qid TEXT NOT NULL,
  userid TEXT NOT NULL,
  choiceid TEXT NOT NULL,
  choice_text TEXT NOT NULL,
  is_correct INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (qid) REFERENCES questions(qid) ON DELETE CASCADE
);`;

export const CHOICES_INDEXES_SQL = `CREATE INDEX idx_choices_qid ON choices (qid);
CREATE UNIQUE INDEX idx_choices_qid_position ON choices (qid, position);`;

export const ATTEMPTS_INDEXES_SQL = `CREATE INDEX idx_attempts_qid ON attempts (qid);
CREATE INDEX idx_attempts_userid ON attempts (userid);`;
