import React, { useCallback, useMemo, useRef, useState } from 'react';
import { SectionList, Text, View, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../components/Screen';
import Segmented from '../components/Segmented';
import TransactionRow from '../components/TransactionRow';
import { ErrorBanner, EmptyState, Loading } from '../components/Feedback';
import { api } from '../api';
import { useTheme, font, weight } from '../theme';
import { errorMessage } from '../utils/errors';
import { dayLabel } from '../utils/date';

const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'recharge', label: 'Recargas' },
  { key: 'payment', label: 'Pagamentos' },
];
const PAGE_SIZE = 20;

// Agrupa as movimentações por dia ("Hoje", "Ontem", "3 de novembro").
function groupByDay(items) {
  const sections = [];
  for (const tx of items) {
    const title = dayLabel(tx.createdAt);
    const last = sections[sections.length - 1];
    if (last && last.title === title) last.data.push(tx);
    else sections.push({ title, data: [tx] });
  }
  return sections;
}

export default function HistoryScreen({ navigation }) {
  const { colors } = useTheme();
  const [filter, setFilter] = useState('all');
  const [items, setItems] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const requestId = useRef(0); // descarta respostas antigas quando o filtro muda rápido

  const load = useCallback(async (type, pageToLoad, replace) => {
    const id = ++requestId.current;
    setError('');
    try {
      const res = await api.transactions.list({ type: type === 'all' ? undefined : type, page: pageToLoad, limit: PAGE_SIZE });
      if (id !== requestId.current) return;
      setItems((prev) => (replace || !prev ? res.data : [...prev, ...res.data]));
      setPage(res.pagination.page);
      setTotalPages(res.pagination.totalPages);
    } catch (err) {
      if (id === requestId.current) { setError(errorMessage(err)); setItems((p) => p ?? []); }
    }
  }, []);

  useFocusEffect(useCallback(() => { load(filter, 1, true); }, [load, filter]));

  async function onRefresh() { setRefreshing(true); await load(filter, 1, true); setRefreshing(false); }
  async function onEnd() {
    if (loadingMore || page >= totalPages || items === null) return;
    setLoadingMore(true);
    await load(filter, page + 1, false);
    setLoadingMore(false);
  }
  function selectFilter(key) { setItems(null); setFilter(key); }

  const sections = useMemo(() => groupByDay(items ?? []), [items]);

  const header = (
    <View style={{ paddingBottom: 8 }}>
      <Text accessibilityRole="header" style={{ color: colors.text, fontSize: font.title, fontWeight: weight.semibold, letterSpacing: -0.4, marginBottom: 16 }}>Histórico</Text>
      <Segmented items={FILTERS} value={filter} onChange={selectFilter} />
      <ErrorBanner message={error} onRetry={() => load(filter, 1, true)} />
    </View>
  );

  return (
    <Screen tab scroll={false}>
      <SectionList
        sections={sections}
        keyExtractor={(t) => t.id}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        renderSectionHeader={({ section }) => (
          <Text style={{ color: colors.textMuted, fontSize: font.small, fontWeight: weight.medium, marginTop: 20, marginBottom: 2 }}>{section.title}</Text>
        )}
        renderItem={({ item, index, section }) => (
          <TransactionRow tx={item} timeOnly last={index === section.data.length - 1}
            onPress={() => navigation.navigate('Receipt', { transactionId: item.id })} />
        )}
        ListEmptyComponent={items === null ? <Loading /> : <EmptyState title="Nenhuma movimentação" text="Suas recargas e passagens aparecerão aqui." />}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={{ margin: 16 }} color={colors.primary} /> : <View style={{ height: 24 }} />}
        onEndReached={onEnd}
        onEndReachedThreshold={0.4}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
    </Screen>
  );
}
