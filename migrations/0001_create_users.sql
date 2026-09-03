-- Migration: create users table for teacher registration.
-- Source of truth: src/lib/users-schema.ts (USERS_TABLE_SQL). Keep the CREATE TABLE body in sync.

CREATE TABLE users (
  userid TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  password TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
