/** @jest-environment node */
// Teste de integração REAL: usa o cliente do app contra o backend rodando.
// Só executa quando API_URL está definida:  API_URL=http://localhost:3000/api/v1 npm run test:integration
import http from 'node:http';
import { createApiClient } from '../src/api/client';
import { createEndpoints } from '../src/api/endpoints';

const API_URL = process.env.API_URL;
const run = API_URL ? describe : describe.skip;

// O preset jest-expo substitui o fetch global por um stub; aqui usamos HTTP real do Node.
function nodeFetch(url, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method, headers }, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => resolve({
        status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300,
        json: async () => JSON.parse(raw), text: async () => raw,
      }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function memoryStorage() {
  let t = null;
  return { load: async () => t, save: async (x) => { t = { ...x }; }, clear: async () => { t = null; }, set: (x) => { t = x; }, peek: () => t };
}
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

run('app ↔ backend (integração real)', () => {
  const storage = memoryStorage();
  const onSessionExpired = jest.fn();
  const api = createEndpoints(createApiClient({ baseUrl: API_URL, storage, onSessionExpired, fetchImpl: nodeFetch }));
  const email = `app-${uid()}@teste.com`;

  test('cadastro cria conta, cartão e salva a sessão', async () => {
    const data = await api.auth.register({ name: 'Passageiro App', email, password: 'senhaSegura1' });
    await storage.save(data.tokens);
    expect(data.card.cardNumber).toMatch(/^BF-\d{4}-\d{4}$/);
    const { wallet } = await api.wallet.get();
    expect(wallet).toMatchObject({ balanceCents: 0, status: 'active', fareCents: 450, minRechargeCents: 500, maxRechargeCents: 50000 });
  });

  test('recarga: saldo atualiza, comprovante existe e a repetição não duplica', async () => {
    const key = `rec-${uid()}`;
    const first = await api.recharge(3000, key);
    expect(first.replayed).toBe(false);
    const again = await api.recharge(3000, key);
    expect(again.replayed).toBe(true);
    expect(again.transaction.id).toBe(first.transaction.id);
    expect((await api.wallet.get()).wallet.balanceCents).toBe(3000);
    const { receipt } = await api.transactions.receipt(first.transaction.id);
    expect(receipt).toMatchObject({ type: 'recharge', amountCents: 3000, isSimulated: true });
  });

  test('regras: recarga fora dos limites e valor inválido são recusados', async () => {
    await expect(api.recharge(100, `low-${uid()}`)).rejects.toMatchObject({ code: 'RECHARGE_BELOW_MINIMUM', status: 422 });
    await expect(api.recharge(99999999, `high-${uid()}`)).rejects.toMatchObject({ code: 'RECHARGE_ABOVE_MAXIMUM' });
  });

  test('pagamento desconta a tarifa do servidor e aparece no histórico e no resumo', async () => {
    const p = await api.payFare(`pay-${uid()}`);
    expect(p.transaction).toMatchObject({ type: 'payment', amountCents: 450, balanceAfterCents: 2550 });
    const list = await api.transactions.list({ limit: 10 });
    expect(list.data.map((t) => t.type)).toEqual(['payment', 'recharge']);
    const onlyRecharges = await api.transactions.list({ type: 'recharge' });
    expect(onlyRecharges.data).toHaveLength(1);
    const { summary } = await api.transactions.summary({});
    expect(summary).toMatchObject({ totalRechargedCents: 3000, totalSpentCents: 450, paymentsCount: 1, rechargesCount: 1 });
  });

  test('cartão bloqueado recusa pagamento; desbloquear restabelece', async () => {
    await api.cards.block();
    await expect(api.payFare(`blk-${uid()}`)).rejects.toMatchObject({ code: 'CARD_BLOCKED' });
    expect((await api.wallet.get()).wallet.status).toBe('blocked');
    await api.cards.unblock();
    await expect(api.payFare(`ok-${uid()}`)).resolves.toBeTruthy();
  });

  test('token de acesso inválido: o cliente renova a sessão sozinho e repete a chamada', async () => {
    const before = storage.peek();
    storage.set({ accessToken: 'token-invalido', refreshToken: before.refreshToken });
    const { wallet } = await api.wallet.get();
    expect(wallet.cardNumber).toMatch(/^BF-/);
    const after = storage.peek();
    expect(after.refreshToken).not.toBe(before.refreshToken); // refresh token rotacionou
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  test('requisições paralelas com token expirado fazem uma única renovação', async () => {
    const t = storage.peek();
    storage.set({ accessToken: 'invalido', refreshToken: t.refreshToken });
    const results = await Promise.all([api.wallet.get(), api.wallet.get(), api.transactions.list({}), api.users.me()]);
    expect(results).toHaveLength(4);
    expect(onSessionExpired).not.toHaveBeenCalled(); // se houvesse reuso do refresh token, o backend revogaria a sessão
  });

  test('perfil: edição do nome', async () => {
    const { user } = await api.users.update({ name: 'Nome Atualizado' });
    expect(user.name).toBe('Nome Atualizado');
  });

  test('logout encerra a sessão: o refresh token deixa de funcionar', async () => {
    const t = storage.peek();
    await api.auth.logout(t.refreshToken);
    storage.set({ accessToken: 'invalido', refreshToken: t.refreshToken });
    await expect(api.wallet.get()).rejects.toMatchObject({ status: 401 });
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    expect(storage.peek()).toBeNull();
  });

  test('login com senha errada devolve a mensagem do backend', async () => {
    await expect(api.auth.login({ email, password: 'errada123' })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha incorretos.' });
    const ok = await api.auth.login({ email, password: 'senhaSegura1' });
    expect(ok.user.email).toBe(email);
  });
});
