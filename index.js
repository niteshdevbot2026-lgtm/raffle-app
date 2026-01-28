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

// List entries for a raffle
app.get('/raffles/:id/entries', (req, res) => {
  const raffleId = Number.parseInt(req.params.id, 10);

  if (!Number.isInteger(raffleId) || raffleId <= 0) {
    return res.status(400).json({ error: 'Invalid raffle id' });
  }

  db.get('SELECT id FROM raffles WHERE id = ?', [raffleId], (raffleErr, raffleRow) => {
    if (raffleErr) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!raffleRow) {
      return res.status(404).json({ error: 'Raffle not found' });
    }

    const query = 'SELECT * FROM entries WHERE raffle_id = ? ORDER BY created_at DESC, id DESC';

    db.all(query, [raffleId], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json(rows);
    });
  });
});

// Select a winner for a raffle
app.post('/raffles/:id/winner', (req, res) => {
  const raffleId = Number.parseInt(req.params.id, 10);

  if (!Number.isInteger(raffleId) || raffleId <= 0) {
    return res.status(400).json({ error: 'Invalid raffle id' });
  }

  db.get('SELECT id FROM raffles WHERE id = ?', [raffleId], (raffleErr, raffleRow) => {
    if (raffleErr) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!raffleRow) {
      return res.status(404).json({ error: 'Raffle not found' });
    }

    db.get('SELECT entry_id FROM raffle_winners WHERE raffle_id = ?', [raffleId], (winnerErr, winnerRow) => {
      if (winnerErr) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (winnerRow) {
        return db.get('SELECT * FROM entries WHERE id = ?', [winnerRow.entry_id], (entryErr, entryRow) => {
          if (entryErr) {
            return res.status(500).json({ error: 'Database error' });
          }

          return res.status(409).json({ error: 'Winner already selected', winner: entryRow });
        });
      }

      db.get('SELECT * FROM entries WHERE raffle_id = ? ORDER BY RANDOM() LIMIT 1', [raffleId], (entryErr, entryRow) => {
        if (entryErr) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (!entryRow) {
          return res.status(400).json({ error: 'No entries for raffle' });
        }

        db.run('INSERT INTO raffle_winners (raffle_id, entry_id) VALUES (?, ?)', [raffleId, entryRow.id], (insertErr) => {
          if (insertErr) {
            return res.status(500).json({ error: 'Database error' });
          }

          return res.status(201).json({ winner: entryRow });
        });
      });
    });
  });
});

// Create an entry for a raffle
app.post('/raffles/:id/entries', (req, res) => {
  const raffleId = Number.parseInt(req.params.id, 10);

  if (!Number.isInteger(raffleId) || raffleId <= 0) {
    return res.status(400).json({ error: 'Invalid raffle id' });
  }

  const { name, email } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Entry name is required' });
  }

  if (email !== undefined && (typeof email !== 'string' || !email.trim())) {
    return res.status(400).json({ error: 'Email must be a non-empty string' });
  }

  db.get('SELECT id FROM raffles WHERE id = ?', [raffleId], (raffleErr, raffleRow) => {
    if (raffleErr) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!raffleRow) {
      return res.status(404).json({ error: 'Raffle not found' });
    }

    const insertQuery = 'INSERT INTO entries (raffle_id, name, email) VALUES (?, ?, ?)';
    const params = [raffleId, name.trim(), email ? email.trim() : null];

    db.run(insertQuery, params, function (err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      db.get('SELECT * FROM entries WHERE id = ?', [this.lastID], (getErr, row) => {
        if (getErr) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.status(201).json(row);
      });
    });
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
