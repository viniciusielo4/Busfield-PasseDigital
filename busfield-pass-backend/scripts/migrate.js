const fs = require('fs');
const path = require('path');

// Aplica, em ordem, as migrações de db/migrations ainda não executadas.
async function runMigrations(pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
  const dir = path.join(__dirname, '..', 'db', 'migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const { rows } = await pool.query('SELECT name FROM schema_migrations');
  const done = new Set(rows.map((r) => r.name));
  const applied = [];
  for (const file of files) {
    if (done.has(file)) continue;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(fs.readFileSync(path.join(dir, file), 'utf8'));
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      applied.push(file);
    } catch (err) {
      await client.query('ROLLBACK');
      throw new Error(`Falha na migração ${file}: ${err.message}`);
    } finally {
      client.release();
    }
  }
  return applied;
}

module.exports = { runMigrations };

if (require.main === module) {
  const { pool } = require('../src/db');
  runMigrations(pool)
    .then((a) => console.log(a.length ? `Migrações aplicadas: ${a.join(', ')}` : 'Banco já está atualizado.'))
    .catch((e) => { console.error(e.message); process.exitCode = 1; })
    .finally(() => pool.end());
}
