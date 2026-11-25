import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, weight } from '../theme';

// Ação redonda com rótulo embaixo (estilo apps de banco). tone: 'primary' | 'danger'
export default function CircleAction({ icon, label, onPress, loading, testID, tone = 'primary' }) {
  const { colors } = useTheme();
  const fg = tone === 'danger' ? colors.error : colors.primary;
  const bg = tone === 'danger' ? colors.errorSoft : colors.primarySoft;
  return (
    <Pressable
      testID={testID} onPress={loading ? undefined : onPress} accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ busy: !!loading }}
      style={({ pressed }) => ({ flex: 1, alignItems: 'center', opacity: pressed ? 0.7 : 1 })}
    >
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        {loading ? <ActivityIndicator color={fg} /> : <Ionicons name={icon} size={24} color={fg} />}
      </View>
      <Text numberOfLines={2} style={{ color: colors.text, fontSize: 12, fontWeight: weight.medium, marginTop: 8, textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}
