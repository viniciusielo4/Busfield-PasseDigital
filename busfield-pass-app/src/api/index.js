import { API_URL, REQUEST_TIMEOUT_MS } from '../config';
import { createApiClient } from './client';
import { createEndpoints } from './endpoints';
import { tokenStorage } from './tokenStorage';

let sessionExpiredHandler = () => {};
// O AuthContext registra aqui o que fazer quando a sessão não puder mais ser renovada.
export const setSessionExpiredHandler = (fn) => { sessionExpiredHandler = fn; };

const client = createApiClient({
  baseUrl: API_URL,
  storage: tokenStorage,
  timeoutMs: REQUEST_TIMEOUT_MS,
  onSessionExpired: () => sessionExpiredHandler(),
});

export const api = createEndpoints(client);
export { tokenStorage };
export { ApiError } from './client';
