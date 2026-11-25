import React from 'react';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, font, weight } from '../theme';
import Button from './Button';
import IconCircle from './IconCircle';

export function ErrorBanner({ message, onRetry }) {
  const { colors } = useTheme();
  if (!message) return null;
  return (
    <View accessibilityRole="alert" style={{ backgroundColor: colors.errorSoft, borderRadius: 14, padding: 14, marginVertical: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name="alert-circle" size={20} color={colors.error} />
        <Text style={{ color: colors.error, marginLeft: 10, flex: 1, fontSize: font.small, fontWeight: weight.medium, lineHeight: 18 }}>{message}</Text>
      </View>
      {onRetry ? <Button title="Tentar novamente" variant="secondary" onPress={onRetry} style={{ marginTop: 10, minHeight: 44 }} /> : null}
    </View>
  );
}

export function SuccessBanner({ message }) {
  const { colors } = useTheme();
  if (!message) return null;
  return (
    <View accessibilityLiveRegion="polite" style={{ backgroundColor: colors.successSoft, borderRadius: 14, padding: 14, marginVertical: 8, flexDirection: 'row', alignItems: 'center' }}>
      <Ionicons name="checkmark-circle" size={20} color={colors.success} />
      <Text style={{ color: colors.success, marginLeft: 10, flex: 1, fontSize: font.small, fontWeight: weight.medium, lineHeight: 18 }}>{message}</Text>
    </View>
  );
}

export function Loading() {
  const { colors } = useTheme();
  return <View style={{ padding: 28, alignItems: 'center' }}><ActivityIndicator size="large" color={colors.primary} /></View>;
}

export function EmptyState({ icon = 'receipt-outline', title, text }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', padding: 28 }}>
      <IconCircle name={icon} tone="primary" size={64} />
      <Text style={{ color: colors.text, fontWeight: weight.semibold, fontSize: font.h2, marginTop: 16 }}>{title}</Text>
      {text ? <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 20 }}>{text}</Text> : null}
    </View>
  );
}

// Título de seção com ação opcional à direita ("Ver tudo").
export function SectionHeader({ title, actionLabel, onAction, style }) {
  const { colors } = useTheme();
  return (
    <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 10 }, style]}>
      <Text accessibilityRole="header" style={{ color: colors.text, fontSize: font.h2, fontWeight: weight.semibold, letterSpacing: -0.2 }}>{title}</Text>
      {actionLabel ? (
        <Pressable onPress={onAction} accessibilityRole="button" accessibilityLabel={actionLabel} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 32 }}>
          <Text style={{ color: colors.primary, fontSize: font.small, fontWeight: weight.semibold }}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

// Mantido por compatibilidade: título de seção simples.
export const Heading = ({ children }) => <SectionHeader title={children} />;
