const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const config = require('./config');
const { query } = require('./db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',') }));
app.use(express.json({ limit: '100kb' }));

app.get('/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', database: 'up' });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'down' });
  }
});

app.use('/api/v1', require('./routes'));
app.use(notFound);
app.use(errorHandler);

module.exports = app;
