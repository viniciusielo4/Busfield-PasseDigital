import React from 'react';
import { View, Text, Pressable } from 'react-native';
import IconCircle from './IconCircle';
import { useTheme, font, weight } from '../theme';
import { formatBRL } from '../utils/money';
import { formatDateTime, timeLabel } from '../utils/date';

// Recarga: ícone verde e valor verde com "+". Pagamento: ícone neutro e valor com "−".
// O sinal e o texto acompanham a cor, para que a cor nunca seja a única pista.
export default function TransactionRow({ tx, onPress, timeOnly = false, last = false, hideAmount = false }) {
  const { colors } = useTheme();
  const isRecharge = tx.type === 'recharge';
  const when = timeOnly ? timeLabel(tx.createdAt) : formatDateTime(tx.createdAt);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${tx.description}, ${isRecharge ? 'entrada' : 'saída'}${hideAmount ? '' : ` de ${formatBRL(tx.amountCents)}`}, ${formatDateTime(tx.createdAt)}`}
      style={{ flexDirection: 'row', alignItems: 'center', minHeight: 64, paddingVertical: 10, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.line }}
    >
      <View style={{ marginRight: 12 }}>
        <IconCircle name={isRecharge ? 'arrow-down' : 'bus-outline'} tone={isRecharge ? 'success' : 'muted'} size={42} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontWeight: weight.medium, fontSize: font.body }}>{tx.description}</Text>
        <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: 1 }}>{when}</Text>
      </View>
      <Text style={{ color: isRecharge ? colors.success : colors.text, fontWeight: weight.semibold, fontSize: font.body }}>
        {hideAmount ? 'R$ ••••' : `${isRecharge ? '+' : '−'} ${formatBRL(tx.amountCents)}`}
      </Text>
    </Pressable>
  );
}
