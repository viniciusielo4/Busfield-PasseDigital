import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import Screen from '../components/Screen';
import Card from '../components/Card';
import CircleAction from '../components/CircleAction';
import ListRow from '../components/ListRow';
import PassCard from '../components/PassCard';
import { ErrorBanner, SuccessBanner, Loading } from '../components/Feedback';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { api } from '../api';
import { useTheme, font, weight } from '../theme';
import { formatBRL } from '../utils/money';
import { errorMessage } from '../utils/errors';
import { confirmDialog } from '../utils/dialog';

export default function CardScreen({ navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { wallet, refresh, loading, hidden } = useWallet();
  const [busy, setBusy] = useState(null);         // 'fare' | 'block' | null
  const [error, setError] = useState(null);       // { message, code }
  const [okMessage, setOkMessage] = useState('');
  const payKey = useRef(null);                    // Idempotency-Key da tentativa de pagamento em andamento

  if (loading && !wallet) return <Screen tab><Loading /></Screen>;
  const blocked = wallet?.status === 'blocked';
  const mask = (cents) => (hidden ? 'R$ ••••' : formatBRL(cents));

  async function toggleBlock() {
    setError(null); setOkMessage('');
    setBusy('block');
    try {
      if (blocked) await api.cards.unblock(); else await api.cards.block();
      await refresh();
    } catch (err) {
      setError({ message: errorMessage(err), code: err.code });
    } finally {
      setBusy(null);
    }
  }

  function confirmToggle() {
    if (blocked) { toggleBlock(); return; }
    confirmDialog({
      title: 'Bloquear cartão?',
      message: 'Enquanto estiver bloqueado, o cartão não poderá pagar passagens nem receber recargas.',
      confirmText: 'Bloquear', destructive: true, onConfirm: toggleBlock,
    });
  }

  async function simulateFare() {
    setError(null); setOkMessage('');
    setBusy('fare');
    if (!payKey.current) payKey.current = randomUUID(); // mesma chave se a tentativa for repetida (ex.: queda de rede)
    try {
      const { transaction } = await api.payFare(payKey.current);
      payKey.current = null;
      setOkMessage(`Passagem validada: ${formatBRL(transaction.amountCents)} debitados. Novo saldo: ${formatBRL(transaction.balanceAfterCents)}.`);
      await refresh();
    } catch (err) {
      if (!err.isNetwork) payKey.current = null; // erro definitivo: a próxima tentativa é uma nova operação
      setError({ message: errorMessage(err), code: err.code });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen tab>
      <Text accessibilityRole="header" style={{ color: colors.text, fontSize: font.title, fontWeight: weight.semibold, letterSpacing: -0.4, marginBottom: 16 }}>Meu cartão</Text>
      <PassCard wallet={wallet} holderName={user?.name} />

      <View style={{ flexDirection: 'row', marginTop: 24, marginBottom: 8 }}>
        <CircleAction testID="card-recharge" icon="add" label="Recarregar" onPress={() => navigation.navigate('Recharge')} />
        <CircleAction testID="simulate-fare" icon="bus-outline" label="Simular passagem" onPress={simulateFare} loading={busy === 'fare'} />
        <CircleAction
          testID="toggle-block" icon={blocked ? 'lock-open-outline' : 'lock-closed-outline'} tone={blocked ? 'primary' : 'danger'}
          label={blocked ? 'Desbloquear cartão' : 'Bloquear cartão'} onPress={confirmToggle} loading={busy === 'block'}
        />
      </View>

      <ErrorBanner message={error?.message} />
      {error?.code === 'INSUFFICIENT_BALANCE' ? <Button title="Recarregar agora" variant="secondary" onPress={() => navigation.navigate('Recharge')} style={{ marginTop: 4 }} /> : null}
      <SuccessBanner message={okMessage} />

      <Card style={{ marginTop: 16, paddingVertical: 4 }}>
        <ListRow title="Saldo" value={mask(wallet?.balanceCents)} />
        <ListRow title="Tarifa da passagem" value={formatBRL(wallet?.fareCents)} />
        <ListRow title="Número do cartão" value={wallet?.cardNumber ?? '—'} />
        <ListRow last title="Status" value={blocked ? 'Bloqueado' : 'Ativo'} valueColor={blocked ? colors.error : colors.success} />
      </Card>
      <Text style={{ color: colors.textMuted, fontSize: font.caption, lineHeight: 17, paddingHorizontal: 4 }}>
        A passagem simulada serve para demonstrar o débito do saldo. Nenhum dinheiro real é movimentado.
      </Text>
    </Screen>
  );
}
