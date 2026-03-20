import sqlite3Pkg from 'sqlite3';
const sqlite3 = sqlite3Pkg.verbose();
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Tabelle für Benutzer und ihre Einstellungen
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    native_language TEXT DEFAULT 'de',
    target_language TEXT DEFAULT 'it'
  )`);

  // Kategorie hat nun eine Ziel-Sprache (z.B. 'it', 'en')
  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    target_language TEXT DEFAULT 'it'
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    native_word TEXT NOT NULL,
    foreign_word TEXT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS verbs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    native_infinitive TEXT NOT NULL,
    foreign_infinitive TEXT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS conjugations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    verb_id INTEGER,
    tense TEXT NOT NULL,
    form_1s TEXT,
    form_2s TEXT,
    form_3s TEXT,
    form_1p TEXT,
    form_2p TEXT,
    form_3p TEXT,
    FOREIGN KEY (verb_id) REFERENCES verbs (id)
  )`);
});

export default db;
