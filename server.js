// Simplified local server — grava apenas localmente em cadastros.txt
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors'); // << adiciona isso

const app = express();
app.use(cors()); // << e isso
app.use(express.json());
app.use(express.static(path.resolve(__dirname))); // serve index.html, assets, etc.

const CADASTROS_FILE = path.join(__dirname, 'cadastros.txt');

app.post('/cadastro', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ ok: false, error: 'dados incompletos' });

  const record = { ts: new Date().toISOString(), name: String(name), email: String(email), password: String(password) };
  const line = JSON.stringify(record) + '\n';
  console.log('Recebido cadastro:', record);

  fs.appendFile(CADASTROS_FILE, line, (err) => {
    if (err) { console.error('Erro ao gravar:', err); return res.status(500).json({ ok: false }); }
    return res.json({ ok: true });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));