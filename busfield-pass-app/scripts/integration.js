// Roda o teste de integração contra o backend real (funciona em Windows, macOS e Linux).
// Uso: npm run test:integration   (ou API_URL=http://outro-host:3000/api/v1 npm run test:integration)
const { spawnSync } = require('child_process');
const env = { ...process.env, API_URL: process.env.API_URL || 'http://localhost:3000/api/v1' };
const r = spawnSync('npx', ['jest', 'tests/integration.test.js'], { stdio: 'inherit', env, shell: true });
process.exit(r.status ?? 1);
