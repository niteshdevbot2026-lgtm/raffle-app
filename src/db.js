const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../data/raffle-app.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Could not connect to database', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Create tables for raffles and entries
const createRafflesTableQuery = `
CREATE TABLE IF NOT EXISTS raffles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

const createEntriesTableQuery = `
CREATE TABLE IF NOT EXISTS entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  raffle_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

// Initialize DB schema
db.serialize(() => {
  db.run(createRafflesTableQuery);
  db.run(createEntriesTableQuery);
});

module.exports = db;
