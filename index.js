const express = require('express');
const app = express();
const db = require('./src/db');
const port = 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Raffle App Backend Running');
});

// Test DB connection endpoint
app.get('/db-test', (req, res) => {
  db.all('SELECT name FROM sqlite_master WHERE type="table"', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ tables: rows.map(r => r.name) });
  });
});

// List raffles
app.get('/raffles', (req, res) => {
  const query = 'SELECT * FROM raffles ORDER BY created_at DESC, id DESC';

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(rows);
  });
});

// Get a raffle by id
app.get('/raffles/:id', (req, res) => {
  const id = Number.parseInt(req.params.id, 10);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid raffle id' });
  }

  db.get('SELECT * FROM raffles WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!row) {
      return res.status(404).json({ error: 'Raffle not found' });
    }

    res.json(row);
  });
});

// Create a raffle
app.post('/raffles', (req, res) => {
  const { name, description } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Raffle name is required' });
  }

  const insertQuery = 'INSERT INTO raffles (name, description) VALUES (?, ?)';
  const params = [name.trim(), description || null];

  db.run(insertQuery, params, function (err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    db.get('SELECT * FROM raffles WHERE id = ?', [this.lastID], (getErr, row) => {
      if (getErr) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(201).json(row);
    });
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
