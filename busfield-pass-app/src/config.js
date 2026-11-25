// Endereço da API. Defina EXPO_PUBLIC_API_URL no arquivo .env (veja .env.example).
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000/api/v1').replace(/\/+$/, '');
export const REQUEST_TIMEOUT_MS = 15000;
