const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.resolve(__dirname))); // serve html estático

const CADASTROS_FILE = path.join(__dirname, 'cadastros.txt');
const PEDIDOS_SQL = path.join(__dirname, 'pedidos.sql');

function esc(s){ return String(s || '').replace(/"/g,'\\"'); }

app.post('/cadastro', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ ok:false, error:'dados incompletos' });
  const line = JSON.stringify({ ts:new Date().toISOString(), name, email, password }) + '\n';
  console.log('Cadastro recebido:', name, email);
  fs.appendFile(CADASTROS_FILE, line, (err) => {
    if(err){ console.error(err); return res.status(500).json({ ok:false }); }
    res.json({ ok:true });
  });
});

app.post('/pedido', (req, res) => {
  const { items, total, customer } = req.body || {};
  if (!Array.isArray(items) || typeof total !== 'number') return res.status(400).json({ ok:false, error:'payload inválido' });

  const customerName = esc((customer && customer.name) || '');
  const customerEmail = esc((customer && customer.email) || '');
  const itemsJson = esc(JSON.stringify(items));
  const ts = new Date().toISOString();
  const sql = `INSERT INTO pedidos (customer_name, customer_email, items_json, total, created_at) VALUES ("${customerName}","${customerEmail}","${itemsJson}", ${Number(total).toFixed(2)}, "${ts}");\n`;

  fs.appendFile(PEDIDOS_SQL, sql, (err) => {
    if(err){ console.error('Erro gravando pedido:', err); return res.status(500).json({ ok:false }); }
    console.log('Pedido gravado:', { total });
    res.json({ ok:true, sql });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log(`Server listening on http://localhost:${PORT}`));