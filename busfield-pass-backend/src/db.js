const { Pool } = require('pg');
const config = require('./config');

// Com DATABASE_SSL=true a conexão é criptografada. Não coloque ?sslmode=... na URL: ele sobrepõe esta opção.
const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
});

const query = (text, params) => pool.query(text, params);

// Executa fn dentro de uma transação: confirma se tudo der certo e desfaz em caso de erro.
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
