const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

let Pool = null;
try { Pool = require('pg').Pool; } catch (e) { /* pg pode não estar instalado localmente */ }

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.resolve(__dirname))); // serve html estático

const CADASTROS_FILE = path.join(__dirname, 'cadastros.txt');
const PEDIDOS_SQL = path.join(__dirname, 'pedidos.sql');

function esc(s){ return String(s || '').replace(/"/g,'\\"'); }

/* --- Optional Postgres pool (enabled when DATABASE_URL set) --- */
let pool = null;
if (process.env.DATABASE_URL && Pool) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  // create table if not exists (safe on startup)
  (async () => {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS pedidos (
          id SERIAL PRIMARY KEY,
          customer_name TEXT,
          customer_email TEXT,
          items_json JSONB,
          total NUMERIC(10,2),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
      console.log('Postgres: tabela pedidos verificada/criada');
    } catch (err) {
      console.error('Postgres init error:', err);
    }
  })();
}

/* cadastro (continua gravando em arquivo como antes) */
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

/* pedido: escreve no Postgres quando disponível; senão, faz append de um INSERT em pedidos.sql */
app.post('/pedido', async (req, res) => {
  const { items, total, customer } = req.body || {};
  if (!Array.isArray(items) || typeof total !== 'number') return res.status(400).json({ ok:false, error:'payload inválido' });

  const customerName = (customer && customer.name) ? String(customer.name) : null;
  const customerEmail = (customer && customer.email) ? String(customer.email) : null;

  if (pool) {
    try {
      const q = `INSERT INTO pedidos (customer_name, customer_email, items_json, total) VALUES ($1,$2,$3,$4) RETURNING id, created_at`;
      const vals = [ customerName, customerEmail, items, Number(total) ];
      const r = await pool.query(q, vals);
      console.log('Pedido salvo no Postgres, id=', r.rows[0].id);
      return res.json({ ok:true, id: r.rows[0].id });
    } catch (err) {
      console.error('Erro gravando no Postgres:', err);
      // fallback para arquivo
    }
  }

  // Fallback: gravar SQL no arquivo (backup)
  try {
    const itemsJson = esc(JSON.stringify(items));
    const ts = new Date().toISOString();
    const sql = `INSERT INTO pedidos (customer_name, customer_email, items_json, total, created_at) VALUES ("${esc(customerName||'')}","${esc(customerEmail||'')}","${itemsJson}", ${Number(total).toFixed(2)}, "${ts}");\n`;
    fs.appendFileSync(PEDIDOS_SQL, sql);
    console.log('Pedido gravado em pedidos.sql (fallback)', { total });
    return res.json({ ok:true, fallback: true });
  } catch (err) {
    console.error('Erro gravando pedido (arquivo):', err);
    return res.status(500).json({ ok:false, error:'erro ao gravar pedido' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log(`Server listening on http://localhost:${PORT}`));