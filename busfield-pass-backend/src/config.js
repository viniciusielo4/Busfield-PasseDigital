require('dotenv').config();

const env = process.env;
const nodeEnv = env.NODE_ENV || 'development';
const isTest = nodeEnv === 'test';
const isProd = nodeEnv === 'production';

const jwtSecret = env.JWT_SECRET || (isTest ? 'segredo-somente-para-testes-0123456789-abcdef' : undefined);
if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error('JWT_SECRET ausente ou curto demais (mínimo de 32 caracteres). Veja o .env.example.');
}
if (isProd && jwtSecret.startsWith('troque-este-valor')) {
  throw new Error('Troque o JWT_SECRET de exemplo por um segredo próprio antes de rodar em produção.');
}
if (!env.DATABASE_URL) {
  throw new Error('DATABASE_URL não definida. Veja o .env.example.');
}

module.exports = {
  nodeEnv, isTest, isProd,
  port: Number(env.PORT || 3000),
  databaseUrl: env.DATABASE_URL,
  // true em provedores na nuvem (Supabase, Neon, Railway...), que exigem conexão criptografada
  databaseSsl: env.DATABASE_SSL === 'true',
  jwtSecret,
  accessTokenTtlSeconds: Number(env.ACCESS_TOKEN_TTL_SECONDS || 900),
  refreshTokenTtlDays: Number(env.REFRESH_TOKEN_TTL_DAYS || 7),
  passwordResetTtlMinutes: 30,
  bcryptCost: Number(env.BCRYPT_COST || (isTest ? 4 : 12)),
  corsOrigin: env.CORS_ORIGIN || '*',
  exposeResetToken: env.EXPOSE_RESET_TOKEN === 'true' && !isProd,
  rateLimitEnabled: !isTest,
};
