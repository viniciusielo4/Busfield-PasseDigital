// Testes de integração: rodam contra um PostgreSQL REAL (banco cujo nome contém "test").
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://busfield:busfield@localhost:5432/busfield_pass_test';
process.env.EXPOSE_RESET_TOKEN = 'true';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const bcrypt = require('bcryptjs');

const app = require('../src/app');
const { pool } = require('../src/db');
const { runMigrations } = require('../scripts/migrate');

const key = () => crypto.randomUUID();
const api = () => request(app);
let n = 0;
async function signup(overrides = {}) {
  const body = { name: 'Passageiro Teste', email: `user${++n}-${Date.now()}@teste.com`, password: 'senhaSegura1', ...overrides };
  const res = await api().post('/api/v1/auth/register').send(body);
  return { res, body, token: res.body.tokens?.accessToken, refresh: res.body.tokens?.refreshToken };
}
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const recharge = (t, amountCents, k = key()) => api().post('/api/v1/recharges').set(auth(t)).set('Idempotency-Key', k).send({ amountCents });
const pay = (t, k = key()) => api().post('/api/v1/payments/fare').set(auth(t)).set('Idempotency-Key', k);
const balance = async (t) => (await api().get('/api/v1/wallet').set(auth(t))).body.wallet.balanceCents;

test.before(async () => {
  const dbName = new URL(process.env.DATABASE_URL).pathname;
  assert.match(dbName, /test/, 'Os testes apagam dados: use um banco com "test" no nome.');
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await runMigrations(pool);
  await pool.query(fs.readFileSync(path.join(__dirname, '..', 'db', 'seeds', 'bus_stops.sql'), 'utf8'));
});
test.after(() => pool.end());

test('GET /health responde e confirma o banco', async () => {
  const res = await api().get('/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.database, 'up');
});

test.describe('Autenticação e conta', () => {
  test('cadastro cria usuário, cartão digital (saldo 0) e tokens', async () => {
    const { res, body } = await signup();
    assert.equal(res.status, 201);
    assert.equal(res.body.user.email, body.email);
    assert.equal(res.body.user.role, 'passenger');
    assert.match(res.body.card.cardNumber, /^BF-\d{4}-\d{4}$/);
    assert.equal(res.body.card.status, 'active');
    assert.equal(res.body.card.balanceCents, 0);
    assert.ok(res.body.tokens.accessToken && res.body.tokens.refreshToken);
    assert.equal(res.body.user.password_hash, undefined);
  });

  test('a senha é guardada apenas como hash', async () => {
    const { body } = await signup();
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE email = $1', [body.email]);
    assert.notEqual(rows[0].password_hash, body.password);
    assert.ok(await bcrypt.compare(body.password, rows[0].password_hash));
  });

  test('rejeita e-mail duplicado (sem diferenciar maiúsculas) e dados inválidos', async () => {
    const { body } = await signup();
    const dup = await api().post('/api/v1/auth/register').send({ ...body, email: body.email.toUpperCase() });
    assert.equal(dup.status, 409);
    assert.equal(dup.body.error.code, 'EMAIL_ALREADY_REGISTERED');
    const weak = await api().post('/api/v1/auth/register').send({ ...body, email: 'novo@teste.com', password: '123' });
    assert.equal(weak.status, 400);
    assert.equal(weak.body.error.code, 'VALIDATION_ERROR');
  });

  test('login válido e inválido', async () => {
    const { body } = await signup();
    const ok = await api().post('/api/v1/auth/login').send({ email: body.email, password: body.password });
    assert.equal(ok.status, 200);
    const bad = await api().post('/api/v1/auth/login').send({ email: body.email, password: 'errada123' });
    assert.equal(bad.status, 401);
    const ghost = await api().post('/api/v1/auth/login').send({ email: 'naoexiste@teste.com', password: 'qualquer123' });
    assert.equal(ghost.status, 401);
    assert.equal(ghost.body.error.code, bad.body.error.code); // mesma resposta: não revela contas
  });

  test('rotas protegidas exigem token', async () => {
    assert.equal((await api().get('/api/v1/users/me')).status, 401);
    assert.equal((await api().get('/api/v1/users/me').set(auth('token-falso'))).status, 401);
  });

  test('perfil: consulta, edição e troca de senha', async () => {
    const { token, body } = await signup();
    const me = await api().get('/api/v1/users/me').set(auth(token));
    assert.equal(me.body.user.name, 'Passageiro Teste');
    const upd = await api().patch('/api/v1/users/me').set(auth(token)).send({ name: 'Novo Nome' });
    assert.equal(upd.body.user.name, 'Novo Nome');
    const empty = await api().patch('/api/v1/users/me').set(auth(token)).send({});
    assert.equal(empty.status, 400);
    const wrong = await api().patch('/api/v1/users/me/password').set(auth(token)).send({ currentPassword: 'x'.repeat(8), newPassword: 'novaSenha99' });
    assert.equal(wrong.status, 401);
    const ok = await api().patch('/api/v1/users/me/password').set(auth(token)).send({ currentPassword: body.password, newPassword: 'novaSenha99' });
    assert.equal(ok.status, 204);
    const login = await api().post('/api/v1/auth/login').send({ email: body.email, password: 'novaSenha99' });
    assert.equal(login.status, 200);
  });

  test('refresh token rotaciona; reuso revoga as sessões; logout encerra a sessão', async () => {
    const { refresh } = await signup();
    const r1 = await api().post('/api/v1/auth/refresh').send({ refreshToken: refresh });
    assert.equal(r1.status, 200);
    const newRefresh = r1.body.tokens.refreshToken;
    const reuse = await api().post('/api/v1/auth/refresh').send({ refreshToken: refresh });
    assert.equal(reuse.status, 401);
    const afterReuse = await api().post('/api/v1/auth/refresh').send({ refreshToken: newRefresh });
    assert.equal(afterReuse.status, 401); // sessão inteira revogada por suspeita de roubo

    const s2 = await signup();
    assert.equal((await api().post('/api/v1/auth/logout').send({ refreshToken: s2.refresh })).status, 204);
    assert.equal((await api().post('/api/v1/auth/refresh').send({ refreshToken: s2.refresh })).status, 401);
  });

  test('recuperação de senha: resposta neutra, token de uso único', async () => {
    const { body } = await signup();
    const ghost = await api().post('/api/v1/auth/forgot-password').send({ email: 'ninguem@teste.com' });
    assert.equal(ghost.status, 202);
    assert.equal(ghost.body.resetToken, undefined);
    const f = await api().post('/api/v1/auth/forgot-password').send({ email: body.email });
    assert.equal(f.status, 202);
    assert.ok(f.body.resetToken);
    const reset = await api().post('/api/v1/auth/reset-password').send({ token: f.body.resetToken, newPassword: 'redefinida123' });
    assert.equal(reset.status, 204);
    const again = await api().post('/api/v1/auth/reset-password').send({ token: f.body.resetToken, newPassword: 'outraSenha123' });
    assert.equal(again.status, 400);
    const login = await api().post('/api/v1/auth/login').send({ email: body.email, password: 'redefinida123' });
    assert.equal(login.status, 200);
  });
});

test.describe('Carteira, recargas e pagamentos', () => {
  test('recarga simulada credita o saldo e gera comprovante', async () => {
    const { token } = await signup();
    const r = await recharge(token, 2000);
    assert.equal(r.status, 201);
    assert.equal(r.body.transaction.type, 'recharge');
    assert.equal(r.body.transaction.balanceAfterCents, 2000);
    assert.equal(r.body.transaction.isSimulated, true);
    assert.equal(await balance(token), 2000);
    const receipt = await api().get(`/api/v1/transactions/${r.body.transaction.id}`).set(auth(token));
    assert.equal(receipt.status, 200);
    assert.match(receipt.body.receipt.notice, /simulada/i);
  });

  test('limites de recarga vêm da configuração (mín. R$ 5,00 / máx. R$ 500,00)', async () => {
    const { token } = await signup();
    const low = await recharge(token, 499);
    assert.equal(low.status, 422);
    assert.equal(low.body.error.code, 'RECHARGE_BELOW_MINIMUM');
    const high = await recharge(token, 50001);
    assert.equal(high.status, 422);
    assert.equal(high.body.error.code, 'RECHARGE_ABOVE_MAXIMUM');
    assert.equal((await recharge(token, 500)).status, 201);
    assert.equal((await recharge(token, 10.5)).status, 400); // só inteiros (centavos)
    assert.equal(await balance(token), 500);
  });

  test('exige Idempotency-Key', async () => {
    const { token } = await signup();
    const res = await api().post('/api/v1/recharges').set(auth(token)).send({ amountCents: 1000 });
    assert.equal(res.status, 400);
    const res2 = await api().post('/api/v1/payments/fare').set(auth(token));
    assert.equal(res2.status, 400);
  });

  test('pagamento desconta a tarifa definida pelo servidor (R$ 4,50)', async () => {
    const { token } = await signup();
    await recharge(token, 1000);
    const p = await pay(token);
    assert.equal(p.status, 201);
    assert.equal(p.body.transaction.amountCents, 450);
    assert.equal(p.body.transaction.balanceAfterCents, 550);
    assert.equal(await balance(token), 550);
  });

  test('saldo insuficiente recusa o pagamento e não altera o saldo', async () => {
    const { token } = await signup();
    await recharge(token, 500);
    assert.equal((await pay(token)).status, 201);          // 500 - 450 = 50
    const p = await pay(token);
    assert.equal(p.status, 422);
    assert.equal(p.body.error.code, 'INSUFFICIENT_BALANCE');
    assert.equal(await balance(token), 50);
  });

  test('idempotência: repetir a mesma chave não duplica a operação', async () => {
    const { token } = await signup();
    const k = key();
    const a = await recharge(token, 1000, k);
    const b = await recharge(token, 1000, k);
    assert.equal(a.status, 201);
    assert.equal(b.status, 200);
    assert.equal(b.body.replayed, true);
    assert.equal(b.body.transaction.id, a.body.transaction.id);
    assert.equal(await balance(token), 1000);
    const conflict = await recharge(token, 2000, k);
    assert.equal(conflict.status, 409);
    assert.equal(conflict.body.error.code, 'IDEMPOTENCY_KEY_REUSED');
  });

  test('cartão bloqueado não paga nem recebe recarga; desbloquear restabelece', async () => {
    const { token } = await signup();
    await recharge(token, 2000);
    const blk = await api().post('/api/v1/cards/me/block').set(auth(token));
    assert.equal(blk.body.card.status, 'blocked');
    const p = await pay(token);
    assert.equal(p.status, 422);
    assert.equal(p.body.error.code, 'CARD_BLOCKED');
    assert.equal((await recharge(token, 1000)).status, 422);
    const unb = await api().post('/api/v1/cards/me/unblock').set(auth(token));
    assert.equal(unb.body.card.status, 'active');
    assert.equal((await pay(token)).status, 201);
    const { rows } = await pool.query(`SELECT action FROM audit_logs WHERE action LIKE 'card.%' ORDER BY id DESC LIMIT 2`);
    assert.deepEqual(rows.map((r) => r.action).sort(), ['card.block', 'card.unblock']);
  });

  test('CONCORRÊNCIA: pagamentos simultâneos nunca deixam o saldo negativo', async () => {
    const { token } = await signup();
    await recharge(token, 900); // dá para exatamente 2 passagens de 450
    const results = await Promise.all(Array.from({ length: 8 }, () => pay(token)));
    const ok = results.filter((r) => r.status === 201).length;
    const refused = results.filter((r) => r.status === 422).length;
    assert.equal(ok, 2);
    assert.equal(refused, 6);
    assert.equal(await balance(token), 0);
  });

  test('CONCORRÊNCIA: a mesma chave enviada em paralelo debita uma única vez', async () => {
    const { token } = await signup();
    await recharge(token, 2000);
    const k = key();
    const results = await Promise.all(Array.from({ length: 6 }, () => pay(token, k)));
    assert.equal(results.filter((r) => r.status === 201).length, 1);
    assert.equal(results.filter((r) => r.status === 200).length, 5);
    assert.equal(await balance(token), 2000 - 450);
  });

  test('o saldo bate com a soma das movimentações', async () => {
    const { token } = await signup();
    await recharge(token, 3000); await recharge(token, 1500); await pay(token); await pay(token);
    const sum = await api().get('/api/v1/transactions/summary').set(auth(token));
    const s = sum.body.summary;
    assert.equal(s.totalRechargedCents - s.totalSpentCents, await balance(token));
    assert.equal(s.paymentsCount, 2);
    assert.equal(s.rechargesCount, 2);
  });

  test('movimentações são imutáveis no banco (UPDATE e DELETE bloqueados)', async () => {
    const { token } = await signup();
    await recharge(token, 1000);
    await assert.rejects(pool.query('UPDATE transactions SET amount_cents = 1'), /imutáveis/);
    await assert.rejects(pool.query('DELETE FROM transactions'), /imutáveis/);
  });

  test('o banco impede saldo negativo mesmo fora da API', async () => {
    const { token } = await signup();
    await assert.rejects(pool.query('UPDATE wallets SET balance_cents = -1'), /check/i);
    assert.equal(await balance(token), 0);
  });
});

test.describe('Histórico', () => {
  test('lista paginada, filtro por tipo e isolamento entre usuários', async () => {
    const a = await signup(); const b = await signup();
    await recharge(a.token, 2000); await pay(a.token); await pay(a.token);
    await recharge(b.token, 1000);
    const all = await api().get('/api/v1/transactions?limit=2').set(auth(a.token));
    assert.equal(all.body.pagination.total, 3);
    assert.equal(all.body.data.length, 2);
    assert.equal(all.body.pagination.totalPages, 2);
    const onlyPay = await api().get('/api/v1/transactions?type=payment').set(auth(a.token));
    assert.equal(onlyPay.body.data.length, 2);
    assert.ok(onlyPay.body.data.every((t) => t.type === 'payment'));
    const bList = await api().get('/api/v1/transactions').set(auth(b.token));
    assert.equal(bList.body.data.length, 1);
    // comprovante de outro usuário não é acessível
    const foreign = await api().get(`/api/v1/transactions/${all.body.data[0].id}`).set(auth(b.token));
    assert.equal(foreign.status, 404);
  });

  test('filtro por período (from/to)', async () => {
    const { token } = await signup();
    await recharge(token, 1000);
    const future = new Date(Date.now() + 86400000).toISOString();
    const none = await api().get(`/api/v1/transactions?from=${encodeURIComponent(future)}`).set(auth(token));
    assert.equal(none.body.data.length, 0);
    const past = new Date(Date.now() - 86400000).toISOString();
    const some = await api().get(`/api/v1/transactions?from=${encodeURIComponent(past)}&to=${encodeURIComponent(future)}`).set(auth(token));
    assert.equal(some.body.data.length, 1);
  });
});

test.describe('Pontos de ônibus', () => {
  test('busca por proximidade ordenada por distância e respeitando o raio', async () => {
    const { token } = await signup();
    const res = await api().get('/api/v1/bus-stops/nearby?lat=-27.5969&lng=-48.5495&radius=1000').set(auth(token));
    assert.equal(res.status, 200);
    assert.ok(res.body.data.length >= 3);
    const d = res.body.data.map((s) => s.distanceMeters);
    assert.deepEqual(d, [...d].sort((x, y) => x - y));
    assert.ok(d.every((m) => m <= 1000));
    assert.ok(!res.body.data.some((s) => s.name.includes('Distante')));
    const one = await api().get(`/api/v1/bus-stops/${res.body.data[0].id}`).set(auth(token));
    assert.equal(one.status, 200);
    assert.equal((await api().get('/api/v1/bus-stops/nearby?lat=abc&lng=1').set(auth(token))).status, 400);
  });
});

test.describe('Administração', () => {
  test('passageiro não acessa /admin; administrador acessa', async () => {
    const { token } = await signup();
    assert.equal((await api().get('/api/v1/admin/stats').set(auth(token))).status, 403);

    const email = `admin-${Date.now()}@teste.com`;
    await pool.query(`INSERT INTO users (name, email, password_hash, role) VALUES ('Admin', $1, $2, 'admin')`, [email, await bcrypt.hash('adminSenha123', 4)]);
    const login = await api().post('/api/v1/auth/login').send({ email, password: 'adminSenha123' });
    const at = login.body.tokens.accessToken;

    const stats = await api().get('/api/v1/admin/stats').set(auth(at));
    assert.equal(stats.status, 200);
    assert.ok(stats.body.stats.passengers >= 1);
    const users = await api().get('/api/v1/admin/users?limit=5').set(auth(at));
    assert.equal(users.status, 200);
    assert.ok(users.body.data[0].card === null || users.body.data[0].card.cardNumber);
    const txs = await api().get('/api/v1/admin/transactions').set(auth(at));
    assert.equal(txs.status, 200);

    const me = await signup();
    const card = (await api().get('/api/v1/cards/me').set(auth(me.token))).body.card;
    const blk = await api().patch(`/api/v1/admin/cards/${card.id}/status`).set(auth(at)).send({ status: 'blocked' });
    assert.equal(blk.body.card.status, 'blocked');
    assert.equal((await pay(me.token)).body.error.code, 'CARD_BLOCKED');
  });

  test('conta desativada perde o acesso imediatamente', async () => {
    const { token, body } = await signup();
    await pool.query('UPDATE users SET is_active = false WHERE email = $1', [body.email]);
    assert.equal((await api().get('/api/v1/users/me').set(auth(token))).status, 401);
  });
});

test('rota inexistente e JSON inválido retornam erros padronizados', async () => {
  const nf = await api().get('/api/v1/nada');
  assert.equal(nf.status, 404);
  assert.equal(nf.body.error.code, 'NOT_FOUND');
  const bad = await api().post('/api/v1/auth/login').set('Content-Type', 'application/json').send('{oops');
  assert.equal(bad.status, 400);
  assert.equal(bad.body.error.code, 'INVALID_JSON');
});
