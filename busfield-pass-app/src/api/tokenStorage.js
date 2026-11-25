import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEY = 'busfield.session';

// No celular: armazenamento seguro do aparelho (Keychain no iOS, Keystore no Android).
// No navegador (uso em desenvolvimento): localStorage, que é menos seguro.
const native = {
  get: () => SecureStore.getItemAsync(KEY),
  set: (v) => SecureStore.setItemAsync(KEY, v),
  del: () => SecureStore.deleteItemAsync(KEY),
};
const web = {
  get: async () => window.localStorage.getItem(KEY),
  set: async (v) => window.localStorage.setItem(KEY, v),
  del: async () => window.localStorage.removeItem(KEY),
};
const store = Platform.OS === 'web' ? web : native;

export const tokenStorage = {
  async load() {
    try {
      const raw = await store.get();
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  async save({ accessToken, refreshToken }) {
    await store.set(JSON.stringify({ accessToken, refreshToken }));
  },
  async clear() {
    try { await store.del(); } catch { /* nada a limpar */ }
  },
};
