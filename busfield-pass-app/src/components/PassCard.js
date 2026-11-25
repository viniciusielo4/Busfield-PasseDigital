import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, weight } from '../theme';

// Cartão do passe: degradê azul (ativo) ou cinza (bloqueado), com formas suaves ao fundo.
// O status aparece também em texto, nunca só pela cor.
export default function PassCard({ wallet, holderName, compact = false }) {
  const { colors } = useTheme();
  const blocked = wallet?.status === 'blocked';
  const gradient = blocked ? [colors.cardBlockedFrom, colors.cardBlockedTo] : [colors.cardFrom, colors.cardTo];
  return (
    <LinearGradient
      colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      accessible accessibilityLabel={`Cartão ${wallet?.cardNumber ?? ''}, ${blocked ? 'bloqueado' : 'ativo'}`}
      style={{ borderRadius: 24, padding: 20, height: compact ? 148 : 196, overflow: 'hidden', justifyContent: 'space-between' }}
    >
      <View pointerEvents="none" style={{ position: 'absolute', right: -70, top: -80, width: 230, height: 230, borderRadius: 115, backgroundColor: 'rgba(255,255,255,0.08)' }} />
      <View pointerEvents="none" style={{ position: 'absolute', right: -10, bottom: -120, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.06)' }} />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="bus" size={18} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: weight.semibold, letterSpacing: 0.2 }}>BusField Pass</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 }}>
          {blocked
            ? <Ionicons name="lock-closed" size={11} color="#FFFFFF" />
            : <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }} />}
          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: weight.medium }}>{blocked ? 'Bloqueado' : 'Ativo'}</Text>
        </View>
      </View>

      <View>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, letterSpacing: 0.8, marginBottom: 2 }}>NÚMERO DO CARTÃO</Text>
        <Text style={{ color: '#FFFFFF', fontSize: compact ? 18 : 22, fontWeight: weight.medium, letterSpacing: 1.5 }}>{wallet?.cardNumber ?? '—'}</Text>
        {!compact && holderName ? (
          <Text numberOfLines={1} style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>{holderName}</Text>
        ) : null}
      </View>
    </LinearGradient>
  );
}
