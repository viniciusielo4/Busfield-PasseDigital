// Cliente HTTP do BusField Pass.
// Cuida de: URL base, JSON, token de acesso, renovação automática da sessão e erros padronizados.
// Recebe as dependências por parâmetro (storage, fetch) para poder ser testado sem o React Native.

export class ApiError extends Error {
  constructor({ status = 0, code = 'UNKNOWN', message = 'Ocorreu um erro inesperado.', details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
  get isNetwork() { return this.code === 'NETWORK_ERROR' || this.code === 'TIMEOUT'; }
}

export function createApiClient({ baseUrl, storage, fetchImpl = (...a) => fetch(...a), timeoutMs = 15000, onSessionExpired = () => {} }) {
  // Refresh tokens são de uso único: se duas requisições expirarem juntas, só UMA pode renovar.
  let refreshing = null;

  async function send(method, path, { body, headers = {}, accessToken } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res;
    try {
      res = await fetchImpl(`${baseUrl}${path}`, {
        method,
        headers: {
          Accept: 'application/json',
          ...(body !== undefined && { 'Content-Type': 'application/json' }),
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
          ...headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (err) {
      if (err && err.name === 'AbortError') {
        throw new ApiError({ code: 'TIMEOUT', message: 'O servidor demorou para responder. Tente novamente.' });
      }
      throw new ApiError({ code: 'NETWORK_ERROR', message: 'Não foi possível conectar ao servidor. Verifique sua conexão.' });
    } finally {
      clearTimeout(timer);
    }

    let data = null;
    if (res.status !== 204) {
      try { data = await res.json(); } catch { data = null; }
    }
    if (!res.ok) {
      const e = (data && data.error) || {};
      throw new ApiError({ status: res.status, code: e.code, message: e.message, details: e.details });
    }
    return data;
  }

  async function refreshSession() {
    if (!refreshing) {
      refreshing = (async () => {
        const current = await storage.load();
        if (!current?.refreshToken) throw new ApiError({ status: 401, code: 'UNAUTHENTICATED', message: 'Sessão expirada.' });
        const data = await send('POST', '/auth/refresh', { body: { refreshToken: current.refreshToken } });
        await storage.save(data.tokens);
        return data.tokens;
      })().finally(() => { refreshing = null; });
    }
    return refreshing;
  }

  async function request(method, path, { body, headers, auth = true } = {}) {
    if (!auth) return send(method, path, { body, headers });

    const tokens = await storage.load();
    try {
      return await send(method, path, { body, headers, accessToken: tokens?.accessToken });
    } catch (err) {
      const expired = err instanceof ApiError && err.status === 401 && ['INVALID_TOKEN', 'UNAUTHENTICATED'].includes(err.code);
      if (!expired) throw err;

      try {
        // Se outra requisição já renovou a sessão, basta reenviar com o token novo.
        const latest = await storage.load();
        const fresh = latest?.accessToken && latest.accessToken !== tokens?.accessToken ? latest : await refreshSession();
        return await send(method, path, { body, headers, accessToken: fresh.accessToken });
      } catch (refreshErr) {
        if (refreshErr instanceof ApiError && refreshErr.status === 401) {
          await storage.clear();
          onSessionExpired();
        }
        throw refreshErr;
      }
    }
  }

  return {
    get: (path, opts) => request('GET', path, opts),
    post: (path, body, opts) => request('POST', path, { ...opts, body }),
    patch: (path, body, opts) => request('PATCH', path, { ...opts, body }),
  };
}
