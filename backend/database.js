const sqlite3 = require('sqlite3').verbose();
const path = require('path');

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
});

module.exports = db;
