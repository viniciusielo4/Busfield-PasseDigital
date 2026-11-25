const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const config = require('../src/config');
const { pool } = require('../src/db');

async function main() {
  // Pontos de ônibus de exemplo (só se a tabela estiver vazia)
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM bus_stops');
  if (rows[0].n === 0) {
    await pool.query(fs.readFileSync(path.join(__dirname, '..', 'db', 'seeds', 'bus_stops.sql'), 'utf8'));
    console.log('Pontos de ônibus de exemplo inseridos.');
  } else {
    console.log('Pontos de ônibus já existem; nada a fazer.');
  }

  // Primeiro administrador (opcional)
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    if (ADMIN_PASSWORD.length < 8) throw new Error('ADMIN_PASSWORD deve ter ao menos 8 caracteres.');
    const hash = await bcrypt.hash(ADMIN_PASSWORD, config.bcryptCost);
    const r = await pool.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ('Administrador', lower($1), $2, 'admin')
       ON CONFLICT DO NOTHING`, [ADMIN_EMAIL, hash]
    );
    console.log(r.rowCount ? `Administrador criado: ${ADMIN_EMAIL}` : 'Administrador já existe.');
  }
}

main().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(() => pool.end());
