-- Base D1 de la webapp DSCG : comptes, sessions, journaux.
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  classe TEXT NOT NULL,
  code_hash TEXT,
  activated_at TEXT,
  fails INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (nom, classe)
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  role TEXT NOT NULL,                -- 'eleve' ou 'prof'
  student_id INTEGER,
  status TEXT NOT NULL DEFAULT 'active', -- active | replaced | revoked
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_student ON sessions (student_id, status);
CREATE TABLE IF NOT EXISTS connexions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER,
  nom TEXT NOT NULL,
  classe TEXT NOT NULL,
  ts TEXT NOT NULL,
  type TEXT NOT NULL                 -- activation | connexion | echec | verrouille | deconnexion_forcee
);
CREATE INDEX IF NOT EXISTS idx_connexions_ts ON connexions (ts);
CREATE TABLE IF NOT EXISTS consultations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER,
  nom TEXT NOT NULL,
  classe TEXT NOT NULL,
  page TEXT NOT NULL,
  titre TEXT,
  ts TEXT NOT NULL,
  duree INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_consultations_ts ON consultations (ts);
CREATE TABLE IF NOT EXISTS throttle (
  k TEXT PRIMARY KEY,
  fails INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT
);
