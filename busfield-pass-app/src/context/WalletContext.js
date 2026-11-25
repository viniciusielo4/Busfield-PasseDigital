import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api';

const WalletContext = createContext(null);

// Guarda o cartão/saldo do usuário logado. O saldo SEMPRE vem do backend; o app nunca o calcula.
export function WalletProvider({ children }) {
  const [wallet, setWallet] = useState(null); // { cardNumber, status, balanceCents, fareCents, minRechargeCents, maxRechargeCents }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hidden, setHidden] = useState(false); // oculta valores na tela (privacidade)
  const toggleHidden = useCallback(() => setHidden((h) => !h), []);

  const refresh = useCallback(async () => {
    try {
      const data = await api.wallet.get();
      setWallet(data.wallet);
      setError(null);
      return data.wallet;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const value = useMemo(() => ({ wallet, loading, error, refresh, hidden, toggleHidden }), [wallet, loading, error, refresh, hidden, toggleHidden]);
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export const useWallet = () => useContext(WalletContext);
