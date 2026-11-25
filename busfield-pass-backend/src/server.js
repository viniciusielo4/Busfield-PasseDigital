const app = require('./app');
const config = require('./config');
const { pool } = require('./db');

const server = app.listen(config.port, () => {
  console.log(`BusField Pass API em http://localhost:${config.port} (${config.nodeEnv})`);
});

function shutdown() {
  server.close(() => pool.end().then(() => process.exit(0)));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
