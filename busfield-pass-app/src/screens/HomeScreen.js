import React, { useCallback, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Avatar from '../components/Avatar';
import PassCard from '../components/PassCard';
import TransactionRow from '../components/TransactionRow';
import { ErrorBanner, SectionHeader, EmptyState, Loading } from '../components/Feedback';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { api } from '../api';
import { useTheme, font, weight } from '../theme';
import { formatBRL } from '../utils/money';
import { currentMonthRange } from '../utils/date';
import { errorMessage } from '../utils/errors';

function Pill({ icon, label, onPress, filled, testID }) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 18, borderRadius: 999,
        backgroundColor: filled ? colors.primary : colors.surface, opacity: pressed ? 0.8 : 1,
      })}
    >
      <Ionicons name={icon} size={18} color={filled ? colors.onPrimary : colors.primary} />
      <Text style={{ color: filled ? colors.onPrimary : colors.text, fontWeight: weight.semibold, fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

function Stat({ label, value, color }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 20, padding: 16 }}>
      <Text style={{ color: colors.textMuted, fontSize: font.small }}>{label}</Text>
      <Text style={{ color: color || colors.text, fontSize: 20, fontWeight: weight.semibold, marginTop: 6, letterSpacing: -0.3 }}>{value}</Text>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { wallet, refresh, loading: walletLoading, error: walletError, hidden, toggleHidden } = useWallet();
  const [summary, setSummary] = useState(null);
  const [latest, setLatest] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const [, s, t] = await Promise.all([
        refresh(),
        api.transactions.summary(currentMonthRange()),
        api.transactions.list({ limit: 3 }),
      ]);
      setSummary(s.summary);
      setLatest(t.data);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [refresh]);

  // Atualiza sempre que a tela volta ao foco (ex.: depois de uma recarga).
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }
  const firstName = user?.name?.split(' ')[0] ?? '';
  const mask = (cents) => (hidden ? 'R$ ••••' : formatBRL(cents));

  return (
    <Screen tab onRefresh={onRefresh} refreshing={refreshing}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={user?.name} />
          <View>
            <Text style={{ color: colors.textMuted, fontSize: font.small }}>Olá,</Text>
            <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 18, fontWeight: weight.semibold, letterSpacing: -0.2 }}>{firstName}</Text>
          </View>
        </View>
        <Pressable
          onPress={toggleHidden} accessibilityRole="button" accessibilityLabel={hidden ? 'Mostrar valores' : 'Ocultar valores'} hitSlop={6}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.text} />
        </Pressable>
      </View>

      <ErrorBanner message={error || (walletError && !wallet ? errorMessage(walletError) : '')} onRetry={load} />

      <Pressable onPress={() => navigation.navigate('History')} accessibilityRole="button" accessibilityLabel="Ver extrato" style={{ marginTop: 28 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.textMuted, fontSize: font.small }}>Saldo disponível</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: colors.primary, fontSize: font.small, fontWeight: weight.semibold }}>Extrato</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </View>
        </View>
        {walletLoading && !wallet ? <Loading /> : (
          <Text testID="balance" style={{ color: colors.text, fontSize: font.display, fontWeight: weight.semibold, letterSpacing: -1, marginTop: 4 }}>
            {wallet ? mask(wallet.balanceCents) : '—'}
          </Text>
        )}
      </Pressable>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20 }}>
        <Pill testID="action-recharge" icon="add" label="Recarregar" filled onPress={() => navigation.navigate('Recharge')} />
        <Pill icon="card-outline" label="Cartão" onPress={() => navigation.navigate('Card')} />
      </View>

      <View style={{ marginTop: 24 }}>
        <PassCard wallet={wallet} compact />
      </View>

      <SectionHeader title="Neste mês" />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Stat label="Gasto com transporte" value={summary ? mask(summary.totalSpentCents) : '—'} />
        <Stat label="Recarregado" value={summary ? mask(summary.totalRechargedCents) : '—'} color={colors.success} />
      </View>

      <SectionHeader title="Últimas movimentações" actionLabel="Ver tudo" onAction={() => navigation.navigate('History')} />
      <Card style={{ paddingVertical: 4 }}>
        {latest === null ? <Loading /> : latest.length === 0
          ? <EmptyState title="Nenhuma movimentação ainda" text="Faça uma recarga para começar." />
          : latest.map((tx, i) => (
            <TransactionRow key={tx.id} tx={tx} hideAmount={hidden} last={i === latest.length - 1} onPress={() => navigation.navigate('Receipt', { transactionId: tx.id })} />
          ))}
      </Card>
    </Screen>
  );
}
