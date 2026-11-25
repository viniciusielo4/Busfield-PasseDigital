import React from 'react';
import { View, Text, ScrollView, RefreshControl, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, font, weight } from '../theme';

// Aviso discreto e sempre visível: operações simuladas devem ser identificadas como demonstração.
export function DemoPill() {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingTop: 6, paddingBottom: 2 }}>
      <View
        accessible accessibilityLabel="Modo demonstração, sem dinheiro real"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.accentSoft, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 12 }}
      >
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }} />
        <Text style={{ color: colors.text, fontSize: 11, fontWeight: weight.medium, letterSpacing: 0.3 }}>Modo demonstração · sem dinheiro real</Text>
      </View>
    </View>
  );
}

// Botão de voltar redondo + título grande da tela.
export function ScreenHeader({ title, subtitle, onBack }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: spacing.lg, marginTop: spacing.xs }}>
      {onBack ? (
        <Pressable
          onPress={onBack} accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={8}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md, marginLeft: -2 }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
      ) : null}
      {title ? <Text accessibilityRole="header" style={{ color: colors.text, fontSize: font.title, fontWeight: weight.semibold, letterSpacing: -0.4 }}>{title}</Text> : null}
      {subtitle ? <Text style={{ color: colors.textMuted, fontSize: font.body, marginTop: 4, lineHeight: 21 }}>{subtitle}</Text> : null}
    </View>
  );
}

// Estrutura base de toda tela: aviso de demonstração, conteúdo (com rolagem opcional) e rodapé fixo opcional.
export default function Screen({ children, tab = false, scroll = true, refreshing, onRefresh, footer, contentStyle }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const bottom = tab ? 0 : insets.bottom;
  const side = spacing.xl;
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <DemoPill />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[{ paddingHorizontal: side, paddingTop: spacing.md, paddingBottom: footer ? spacing.lg : spacing.xl + bottom }, contentStyle]}
            refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1, paddingHorizontal: side, paddingTop: spacing.md }, contentStyle]}>{children}</View>
        )}
        {footer ? <View style={{ paddingHorizontal: side, paddingTop: spacing.sm, paddingBottom: spacing.md + bottom }}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </View>
  );
}
