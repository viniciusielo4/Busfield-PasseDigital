/** @jest-environment node */
import { createApiClient, ApiError } from '../src/api/client';
import { createEndpoints } from '../src/api/endpoints';

function memoryStorage(initial = null) {
  let tokens = initial;
  return {
    load: async () => tokens, save: async (t) => { tokens = { ...t }; }, clear: async () => { tokens = null; },
    peek: () => tokens,
  };
}
const json = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body });
const unauthorized = () => json(401, { error: { code: 'INVALID_TOKEN', message: 'Token inválido ou expirado.' } });

describe('createApiClient', () => {
  test('envia o token e devolve o JSON', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(json(200, { ok: true }));
    const client = createApiClient({ baseUrl: 'http://x/api', storage: memoryStorage({ accessToken: 'A', refreshToken: 'R' }), fetchImpl });
    expect(await client.get('/ping')).toEqual({ ok: true });
    const [url, opts] = fetchImpl.mock.calls[0];
    expect(url).toBe('http://x/api/ping');
    expect(opts.headers.Authorization).toBe('Bearer A');
  });

  test('normaliza erros da API em ApiError', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(json(422, { error: { code: 'INSUFFICIENT_BALANCE', message: 'Saldo insuficiente para a tarifa.' } }));
    const client = createApiClient({ baseUrl: 'http://x', storage: memoryStorage({ accessToken: 'A', refreshToken: 'R' }), fetchImpl });
    await expect(client.post('/payments/fare')).rejects.toMatchObject({ status: 422, code: 'INSUFFICIENT_BALANCE', message: 'Saldo insuficiente para a tarifa.' });
  });

  test('falha de rede e timeout viram erros de conexão', async () => {
    const net = createApiClient({ baseUrl: 'http://x', storage: memoryStorage(), fetchImpl: jest.fn().mockRejectedValue(new TypeError('Network request failed')) });
    const e1 = await net.get('/a', { auth: false }).catch((e) => e);
    expect(e1).toBeInstanceOf(ApiError);
    expect(e1.isNetwork).toBe(true);
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    const t = createApiClient({ baseUrl: 'http://x', storage: memoryStorage(), fetchImpl: jest.fn().mockRejectedValue(abort) });
    expect((await t.get('/a', { auth: false }).catch((e) => e)).code).toBe('TIMEOUT');
  });

  test('token expirado: renova a sessão e repete a requisição', async () => {
    const storage = memoryStorage({ accessToken: 'OLD', refreshToken: 'R1' });
    const fetchImpl = jest.fn(async (url, opts) => {
      if (url.endsWith('/auth/refresh')) return json(200, { tokens: { accessToken: 'NEW', refreshToken: 'R2' } });
      return opts.headers.Authorization === 'Bearer NEW' ? json(200, { data: 1 }) : unauthorized();
    });
    const client = createApiClient({ baseUrl: 'http://x', storage, fetchImpl });
    expect(await client.get('/wallet')).toEqual({ data: 1 });
    expect(storage.peek()).toEqual({ accessToken: 'NEW', refreshToken: 'R2' });
  });

  test('várias requisições expiradas juntas fazem UMA só renovação (refresh token é de uso único)', async () => {
    const storage = memoryStorage({ accessToken: 'OLD', refreshToken: 'R1' });
    let refreshCalls = 0;
    const fetchImpl = jest.fn(async (url, opts) => {
      if (url.endsWith('/auth/refresh')) { refreshCalls++; await new Promise((r) => setTimeout(r, 20)); return json(200, { tokens: { accessToken: 'NEW', refreshToken: 'R2' } }); }
      return opts.headers.Authorization === 'Bearer NEW' ? json(200, { ok: 1 }) : unauthorized();
    });
    const client = createApiClient({ baseUrl: 'http://x', storage, fetchImpl });
    const results = await Promise.all([client.get('/a'), client.get('/b'), client.get('/c'), client.get('/d')]);
    expect(results).toHaveLength(4);
    expect(refreshCalls).toBe(1);
  });

  test('refresh recusado: limpa a sessão e avisa o app', async () => {
    const storage = memoryStorage({ accessToken: 'OLD', refreshToken: 'R1' });
    const onSessionExpired = jest.fn();
    const fetchImpl = jest.fn(async (url) => (url.endsWith('/auth/refresh')
      ? json(401, { error: { code: 'INVALID_REFRESH_TOKEN', message: 'Sessão inválida ou expirada.' } })
      : unauthorized()));
    const client = createApiClient({ baseUrl: 'http://x', storage, fetchImpl, onSessionExpired });
    await expect(client.get('/wallet')).rejects.toMatchObject({ code: 'INVALID_REFRESH_TOKEN' });
    expect(storage.peek()).toBeNull();
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  test('queda de rede durante a renovação NÃO derruba a sessão', async () => {
    const storage = memoryStorage({ accessToken: 'OLD', refreshToken: 'R1' });
    const onSessionExpired = jest.fn();
    const fetchImpl = jest.fn(async (url) => { if (url.endsWith('/auth/refresh')) throw new TypeError('offline'); return unauthorized(); });
    const client = createApiClient({ baseUrl: 'http://x', storage, fetchImpl, onSessionExpired });
    await expect(client.get('/wallet')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    expect(storage.peek()).not.toBeNull();
    expect(onSessionExpired).not.toHaveBeenCalled();
  });
});

describe('endpoints', () => {
  test('recarga e pagamento enviam o Idempotency-Key e o valor em centavos', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(json(201, { transaction: {} }));
    const api = createEndpoints(createApiClient({ baseUrl: 'http://x/api/v1', storage: memoryStorage({ accessToken: 'A', refreshToken: 'R' }), fetchImpl }));
    await api.recharge(2000, 'key-1234567');
    let [url, opts] = fetchImpl.mock.calls[0];
    expect(url).toBe('http://x/api/v1/recharges');
    expect(opts.headers['Idempotency-Key']).toBe('key-1234567');
    expect(JSON.parse(opts.body)).toEqual({ amountCents: 2000 });
    await api.payFare('key-7654321');
    [url, opts] = fetchImpl.mock.calls[1];
    expect(url).toBe('http://x/api/v1/payments/fare');
    expect(opts.headers['Idempotency-Key']).toBe('key-7654321');
    expect(opts.body).toBeUndefined();
  });

  test('histórico monta a query string e ignora filtros vazios', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(json(200, { data: [] }));
    const api = createEndpoints(createApiClient({ baseUrl: 'http://x', storage: memoryStorage({ accessToken: 'A', refreshToken: 'R' }), fetchImpl }));
    await api.transactions.list({ type: 'payment', page: 2, limit: 20, from: undefined });
    expect(fetchImpl.mock.calls[0][0]).toBe('http://x/transactions?type=payment&page=2&limit=20');
  });
});
