import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokenStorage, setSessionExpiredHandler } from '../api';

const AuthContext = createContext(null);

// status: 'loading' (abrindo o app) | 'signedIn' | 'signedOut' | 'offline' (sem conexão ao restaurar a sessão)
export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading');
  const [user, setUser] = useState(null);

  const restore = useCallback(async () => {
    setStatus('loading');
    const tokens = await tokenStorage.load();
    if (!tokens) { setStatus('signedOut'); return; }
    try {
      const { user: me } = await api.users.me();
      setUser(me);
      setStatus('signedIn');
    } catch (err) {
      if (err.isNetwork) setStatus('offline');
      else { await tokenStorage.clear(); setStatus('signedOut'); }
    }
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => { setUser(null); setStatus('signedOut'); });
    restore();
  }, [restore]);

  const signIn = useCallback(async (email, password) => {
    const data = await api.auth.login({ email: email.trim(), password });
    await tokenStorage.save(data.tokens);
    setUser(data.user);
    setStatus('signedIn');
  }, []);

  const signUp = useCallback(async ({ name, email, password }) => {
    const data = await api.auth.register({ name: name.trim(), email: email.trim(), password });
    await tokenStorage.save(data.tokens);
    setUser(data.user);
    setStatus('signedIn');
  }, []);

  const signOut = useCallback(async () => {
    const tokens = await tokenStorage.load();
    if (tokens?.refreshToken) { try { await api.auth.logout(tokens.refreshToken); } catch { /* encerra localmente mesmo assim */ } }
    await tokenStorage.clear();
    setUser(null);
    setStatus('signedOut');
  }, []);

  const value = useMemo(() => ({ status, user, setUser, signIn, signUp, signOut, restore }), [status, user, signIn, signUp, signOut, restore]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
