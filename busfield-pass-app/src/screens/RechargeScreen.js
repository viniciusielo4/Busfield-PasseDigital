import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import Screen, { ScreenHeader } from '../components/Screen';
import Card from '../components/Card';
import Button from '../components/Button';
import Chip from '../components/Chip';
import ListRow from '../components/ListRow';
import TextField from '../components/TextField';
import { ErrorBanner } from '../components/Feedback';
import { useWallet } from '../context/WalletContext';
import { api } from '../api';
import { useTheme, font, weight } from '../theme';
import { formatBRL, parseToCents } from '../utils/money';
import { errorMessage } from '../utils/errors';

const QUICK_VALUES = [1000, 2000, 3000, 5000]; // centavos

export default function RechargeScreen({ navigation }) {
  const { colors } = useTheme();
  const { wallet, refresh } = useWallet();
  const [selected, setSelected] = useState(2000);
  const [custom, setCustom] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const key = useRef(null); // Idempotency-Key: evita recarga duplicada se o usuário (ou a rede) repetir a tentativa

  const usingCustom = custom.trim() !== '';
  const amount = usingCustom ? parseToCents(custom) : selected;
  const blocked = wallet?.status === 'blocked';

  let amountError = '';
  if (usingCustom && amount === null) amountError = 'Digite um valor válido, como 25,00.';
  else if (amount !== null && wallet) {
    if (amount < wallet.minRechargeCents) amountError = `A recarga mínima é ${formatBRL(wallet.minRechargeCents)}.`;
    else if (amount > wallet.maxRechargeCents) amountError = `A recarga máxima é ${formatBRL(wallet.maxRechargeCents)}.`;
  }
  const valid = amount !== null && !amountError;
  const canSubmit = !!wallet && !blocked && valid;

  async function confirm() {
    setError('');
    setLoading(true);
    if (!key.current) key.current = randomUUID();
    try {
      const { transaction } = await api.recharge(amount, key.current);
      key.current = null;
      await refresh();
      navigation.replace('Receipt', { transactionId: transaction.id, justConfirmed: true });
    } catch (err) {
      if (!err.isNetwork) key.current = null; // só reaproveita a chave quando o resultado é incerto (rede/timeout)
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  const footer = (
    <>
      <Button title="Confirmar recarga" onPress={confirm} loading={loading} disabled={!canSubmit} testID="confirm-recharge" style={{ marginTop: 0 }} />
      <Text style={{ color: colors.textMuted, fontSize: font.caption, textAlign: 'center', marginTop: 10 }}>Demonstração: nenhum dinheiro real é movimentado.</Text>
    </>
  );

  return (
    <Screen footer={footer}>
      <ScreenHeader title="Recarregar" onBack={() => navigation.goBack()} />

      {blocked ? <ErrorBanner message="Cartão bloqueado. Desbloqueie o cartão para fazer recargas." /> : null}
      <ErrorBanner message={error} />

      <View style={{ alignItems: 'center', marginTop: 12, marginBottom: 24 }}>
        <Text style={{ color: colors.textMuted, fontSize: font.small }}>Valor da recarga</Text>
        <Text testID="amount-display" style={{ color: valid ? colors.text : colors.textMuted, fontSize: 44, fontWeight: weight.semibold, letterSpacing: -1.2, marginTop: 4 }}>
          {valid ? formatBRL(amount) : 'R$ —'}
        </Text>
        {wallet ? <Text style={{ color: colors.textMuted, fontSize: font.caption, marginTop: 4 }}>De {formatBRL(wallet.minRechargeCents)} até {formatBRL(wallet.maxRechargeCents)}</Text> : null}
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {QUICK_VALUES.map((v) => (
          <Chip key={v} testID={`chip-${v}`} label={formatBRL(v)} style={{ flex: 1, paddingHorizontal: 0 }} selected={!usingCustom && selected === v} onPress={() => { setCustom(''); setSelected(v); }} />
        ))}
      </View>

      <TextField label="Outro valor (R$)" value={custom} onChangeText={setCustom} keyboardType="decimal-pad" placeholder="Ex.: 25,00" error={amountError} testID="custom-amount" />

      <Card style={{ marginTop: 20, paddingVertical: 4 }}>
        <ListRow title="Saldo atual" value={wallet ? formatBRL(wallet.balanceCents) : '—'} />
        <ListRow last title="Saldo após a recarga" value={valid && wallet ? formatBRL(wallet.balanceCents + amount) : '—'} />
      </Card>
    </Screen>
  );
}
