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

// Get a single entry for a raffle
app.get('/raffles/:id/entries/:entryId', (req, res) => {
  const raffleId = Number.parseInt(req.params.id, 10);
  const entryId = Number.parseInt(req.params.entryId, 10);

  if (!Number.isInteger(raffleId) || raffleId <= 0) {
    return res.status(400).json({ error: 'Invalid raffle id' });
  }

  if (!Number.isInteger(entryId) || entryId <= 0) {
    return res.status(400).json({ error: 'Invalid entry id' });
  }

  db.get('SELECT id FROM raffles WHERE id = ?', [raffleId], (raffleErr, raffleRow) => {
    if (raffleErr) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!raffleRow) {
      return res.status(404).json({ error: 'Raffle not found' });
    }

    db.get('SELECT * FROM entries WHERE id = ? AND raffle_id = ?', [entryId, raffleId], (entryErr, entryRow) => {
      if (entryErr) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!entryRow) {
        return res.status(404).json({ error: 'Entry not found' });
      }

      return res.json(entryRow);
    });
  });
});

// Update an entry for a raffle
app.patch('/raffles/:id/entries/:entryId', (req, res) => {
  const raffleId = Number.parseInt(req.params.id, 10);
  const entryId = Number.parseInt(req.params.entryId, 10);

  if (!Number.isInteger(raffleId) || raffleId <= 0) {
    return res.status(400).json({ error: 'Invalid raffle id' });
  }

  if (!Number.isInteger(entryId) || entryId <= 0) {
    return res.status(400).json({ error: 'Invalid entry id' });
  }

  const { name, email } = req.body;

  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    return res.status(400).json({ error: 'Entry name must be a non-empty string' });
  }

  if (email !== undefined && (typeof email !== 'string' || !email.trim())) {
    return res.status(400).json({ error: 'Email must be a non-empty string' });
  }

  if (name === undefined && email === undefined) {
    return res.status(400).json({ error: 'No fields provided to update' });
  }

  db.get('SELECT id FROM raffles WHERE id = ?', [raffleId], (raffleErr, raffleRow) => {
    if (raffleErr) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!raffleRow) {
      return res.status(404).json({ error: 'Raffle not found' });
    }

    db.get('SELECT * FROM entries WHERE id = ? AND raffle_id = ?', [entryId, raffleId], (entryErr, entryRow) => {
      if (entryErr) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!entryRow) {
        return res.status(404).json({ error: 'Entry not found' });
      }

      const updatedName = name !== undefined ? name.trim() : entryRow.name;
      const updatedEmail = email !== undefined ? email.trim() : entryRow.email;

      db.run(
        'UPDATE entries SET name = ?, email = ? WHERE id = ? AND raffle_id = ?',
        [updatedName, updatedEmail, entryId, raffleId],
        (updateErr) => {
          if (updateErr) {
            return res.status(500).json({ error: 'Database error' });
          }

          db.get('SELECT * FROM entries WHERE id = ? AND raffle_id = ?', [entryId, raffleId], (getErr, row) => {
            if (getErr) {
              return res.status(500).json({ error: 'Database error' });
            }

            return res.json(row);
          });
        }
      );
    });
  });
});

// Get winner for a raffle
app.get('/raffles/:id/winner', (req, res) => {
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

    const query = `
      SELECT rw.selected_at as selected_at, e.*
      FROM raffle_winners rw
      JOIN entries e ON e.id = rw.entry_id
      WHERE rw.raffle_id = ?
    `;

    db.get(query, [raffleId], (winnerErr, winnerRow) => {
      if (winnerErr) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!winnerRow) {
        return res.status(404).json({ error: 'Winner not selected' });
      }

      const winner = { ...winnerRow };
      delete winner.selected_at;

      return res.json({ winner, selected_at: winnerRow.selected_at });
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

// Clear winner for a raffle
app.delete('/raffles/:id/winner', (req, res) => {
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

      if (!winnerRow) {
        return res.status(404).json({ error: 'Winner not selected' });
      }

      db.run('DELETE FROM raffle_winners WHERE raffle_id = ?', [raffleId], (deleteErr) => {
        if (deleteErr) {
          return res.status(500).json({ error: 'Database error' });
        }

        return res.json({ deleted: true, raffle_id: raffleId, entry_id: winnerRow.entry_id });
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

// Delete an entry from a raffle
app.delete('/raffles/:id/entries/:entryId', (req, res) => {
  const raffleId = Number.parseInt(req.params.id, 10);
  const entryId = Number.parseInt(req.params.entryId, 10);

  if (!Number.isInteger(raffleId) || raffleId <= 0) {
    return res.status(400).json({ error: 'Invalid raffle id' });
  }

  if (!Number.isInteger(entryId) || entryId <= 0) {
    return res.status(400).json({ error: 'Invalid entry id' });
  }

  db.get('SELECT id FROM raffles WHERE id = ?', [raffleId], (raffleErr, raffleRow) => {
    if (raffleErr) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!raffleRow) {
      return res.status(404).json({ error: 'Raffle not found' });
    }

    db.get('SELECT * FROM entries WHERE id = ? AND raffle_id = ?', [entryId, raffleId], (entryErr, entryRow) => {
      if (entryErr) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!entryRow) {
        return res.status(404).json({ error: 'Entry not found' });
      }

      let responded = false;
      const handleError = (err) => {
        if (responded) return;
        responded = true;
        return res.status(500).json({ error: 'Database error' });
      };

      db.serialize(() => {
        db.get(
          'SELECT id FROM raffle_winners WHERE raffle_id = ? AND entry_id = ?',
          [raffleId, entryId],
          (winnerErr, winnerRow) => {
            if (winnerErr) {
              return handleError(winnerErr);
            }

            const winnerCleared = Boolean(winnerRow);

            db.run(
              'DELETE FROM raffle_winners WHERE raffle_id = ? AND entry_id = ?',
              [raffleId, entryId],
              (deleteWinnerErr) => {
                if (deleteWinnerErr) {
                  return handleError(deleteWinnerErr);
                }

                db.run('DELETE FROM entries WHERE id = ?', [entryId], (deleteErr) => {
                  if (deleteErr) {
                    return handleError(deleteErr);
                  }

                  if (!responded) {
                    responded = true;
                    return res.json({
                      deleted: true,
                      id: entryId,
                      raffle_id: raffleId,
                      winner_cleared: winnerCleared
                    });
                  }
                });
              }
            );
          }
        );
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

// Update raffle fields
app.patch('/raffles/:id', (req, res) => {
  const raffleId = Number.parseInt(req.params.id, 10);

  if (!Number.isInteger(raffleId) || raffleId <= 0) {
    return res.status(400).json({ error: 'Invalid raffle id' });
  }

  const { name, description } = req.body;

  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    return res.status(400).json({ error: 'Raffle name must be a non-empty string' });
  }

  if (description !== undefined && typeof description !== 'string') {
    return res.status(400).json({ error: 'Description must be a string' });
  }

  if (name === undefined && description === undefined) {
    return res.status(400).json({ error: 'No fields provided to update' });
  }

  db.get('SELECT * FROM raffles WHERE id = ?', [raffleId], (raffleErr, raffleRow) => {
    if (raffleErr) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!raffleRow) {
      return res.status(404).json({ error: 'Raffle not found' });
    }

    const updatedName = name !== undefined ? name.trim() : raffleRow.name;
    const updatedDescription = description !== undefined
      ? (description.trim() ? description.trim() : null)
      : raffleRow.description;

    db.run(
      'UPDATE raffles SET name = ?, description = ? WHERE id = ?',
      [updatedName, updatedDescription, raffleId],
      (updateErr) => {
        if (updateErr) {
          return res.status(500).json({ error: 'Database error' });
        }

        db.get('SELECT * FROM raffles WHERE id = ?', [raffleId], (getErr, row) => {
          if (getErr) {
            return res.status(500).json({ error: 'Database error' });
          }

          return res.json(row);
        });
      }
    );
  });
});

// Delete a raffle and related data
app.delete('/raffles/:id', (req, res) => {
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

    let responded = false;
    const handleError = (err) => {
      if (responded) return;
      responded = true;
      return res.status(500).json({ error: 'Database error' });
    };

    db.serialize(() => {
      db.run('DELETE FROM raffle_winners WHERE raffle_id = ?', [raffleId], (winnerErr) => {
        if (winnerErr) {
          return handleError(winnerErr);
        }
      });

      db.run('DELETE FROM entries WHERE raffle_id = ?', [raffleId], (entriesErr) => {
        if (entriesErr) {
          return handleError(entriesErr);
        }
      });

      db.run('DELETE FROM raffles WHERE id = ?', [raffleId], (deleteErr) => {
        if (deleteErr) {
          return handleError(deleteErr);
        }

        if (!responded) {
          responded = true;
          return res.json({ deleted: true, id: raffleId });
        }
      });
    });
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
