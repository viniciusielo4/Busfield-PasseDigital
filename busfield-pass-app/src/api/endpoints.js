// Funções de alto nível, uma por endpoint do backend (/api/v1).
const qs = (params = {}) => {
  const q = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  return q ? `?${q}` : '';
};

export function createEndpoints(client) {
  return {
    auth: {
      register: (data) => client.post('/auth/register', data, { auth: false }),
      login: (data) => client.post('/auth/login', data, { auth: false }),
      logout: (refreshToken) => client.post('/auth/logout', { refreshToken }, { auth: false }),
      forgotPassword: (email) => client.post('/auth/forgot-password', { email }, { auth: false }),
      resetPassword: (token, newPassword) => client.post('/auth/reset-password', { token, newPassword }, { auth: false }),
    },
    users: {
      me: () => client.get('/users/me'),
      update: (data) => client.patch('/users/me', data),
    },
    cards: {
      block: () => client.post('/cards/me/block'),
      unblock: () => client.post('/cards/me/unblock'),
    },
    wallet: { get: () => client.get('/wallet') },
    // O Idempotency-Key evita cobrança duplicada: o mesmo valor deve ser reenviado ao repetir a MESMA tentativa.
    recharge: (amountCents, idempotencyKey) =>
      client.post('/recharges', { amountCents }, { headers: { 'Idempotency-Key': idempotencyKey } }),
    payFare: (idempotencyKey) =>
      client.post('/payments/fare', undefined, { headers: { 'Idempotency-Key': idempotencyKey } }),
    transactions: {
      list: (params) => client.get(`/transactions${qs(params)}`),
      summary: (params) => client.get(`/transactions/summary${qs(params)}`),
      receipt: (id) => client.get(`/transactions/${encodeURIComponent(id)}`),
    },
  };
}
