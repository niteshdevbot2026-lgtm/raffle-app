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

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
