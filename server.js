const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.resolve(__dirname)));

const CADASTROS_FILE = path.join(__dirname, 'cadastros.txt');

app.post('/cadastro', (req, res) => {
  const { name, email, password, sql } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ ok: false, error: 'dados incompletos' });
  }

  const record = {
    ts: new Date().toISOString(),
    name: String(name),
    email: String(email),
    password: String(password),
    sql: sql ? String(sql) : null
  };

  const line = JSON.stringify(record) + '\n';
  console.log('Recebido cadastro:', record);

  fs.appendFile(CADASTROS_FILE, line, (err) => {
    if (err) {
      console.error('Erro ao gravar cadastro:', err);
      return res.status(500).json({ ok: false, error: 'erro ao gravar' });
    }
    return res.json({ ok: true });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));