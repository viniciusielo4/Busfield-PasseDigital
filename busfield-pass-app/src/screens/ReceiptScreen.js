import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Screen, { ScreenHeader } from '../components/Screen';
import Card from '../components/Card';
import Button from '../components/Button';
import ListRow from '../components/ListRow';
import IconCircle from '../components/IconCircle';
import { ErrorBanner, Loading } from '../components/Feedback';
import { api } from '../api';
import { useTheme, font, weight } from '../theme';
import { formatBRL } from '../utils/money';
import { formatDateTime } from '../utils/date';
import { errorMessage } from '../utils/errors';

export default function ReceiptScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { transactionId, justConfirmed } = route.params;
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try { setReceipt((await api.transactions.receipt(transactionId)).receipt); }
    catch (err) { setError(errorMessage(err)); }
  }, [transactionId]);
  useEffect(() => { load(); }, [load]);

  const isRecharge = receipt?.type === 'recharge';
  const footer = receipt ? (
    <Button title={justConfirmed ? 'Voltar ao início' : 'Fechar'} onPress={() => (justConfirmed ? navigation.popToTop() : navigation.goBack())} testID="receipt-close" style={{ marginTop: 0 }} />
  ) : null;

  return (
    <Screen footer={footer}>
      {!justConfirmed ? <ScreenHeader onBack={() => navigation.goBack()} /> : null}
      <ErrorBanner message={error} onRetry={load} />
      {!receipt && !error ? <Loading /> : null}
      {receipt ? (
        <>
          <View style={{ alignItems: 'center', marginTop: justConfirmed ? 36 : 8, marginBottom: 28 }}>
            <IconCircle name={justConfirmed ? 'checkmark' : isRecharge ? 'arrow-down' : 'bus-outline'} tone={justConfirmed || isRecharge ? 'success' : 'muted'} size={72} />
            <Text accessibilityRole="header" style={{ color: colors.text, fontSize: font.h2, fontWeight: weight.semibold, marginTop: 16 }}>
              {justConfirmed ? 'Recarga confirmada' : isRecharge ? 'Recarga' : 'Pagamento de passagem'}
            </Text>
            <Text style={{ color: isRecharge ? colors.success : colors.text, fontSize: 38, fontWeight: weight.semibold, letterSpacing: -1, marginTop: 6 }}>
              {isRecharge ? '+' : '−'} {formatBRL(receipt.amountCents)}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: 4 }}>{formatDateTime(receipt.createdAt)}</Text>
          </View>
          <Card style={{ paddingVertical: 4 }}>
            <ListRow title="Tipo" value={isRecharge ? 'Recarga' : 'Pagamento de passagem'} />
            <ListRow title="Saldo após a operação" value={formatBRL(receipt.balanceAfterCents)} />
            <ListRow title="Cartão" value={receipt.cardNumber} />
            <ListRow last title="Código da operação" value={receipt.id.slice(0, 8).toUpperCase()} />
          </Card>
          {receipt.notice ? <Text style={{ color: colors.textMuted, fontSize: font.caption, lineHeight: 17, textAlign: 'center', paddingHorizontal: 8 }}>{receipt.notice}</Text> : null}
        </>
      ) : null}
    </Screen>
  );
}
