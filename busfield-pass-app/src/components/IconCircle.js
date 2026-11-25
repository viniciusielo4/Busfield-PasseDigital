import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

// Ícone dentro de um círculo suave. tone: 'primary' | 'success' | 'error' | 'muted'
export default function IconCircle({ name, tone = 'primary', size = 40 }) {
  const { colors } = useTheme();
  const map = {
    primary: [colors.primarySoft, colors.primary], success: [colors.successSoft, colors.success],
    error: [colors.errorSoft, colors.error], muted: [colors.chip, colors.textMuted],
  }[tone];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: map[0], alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={name} size={Math.round(size * 0.5)} color={map[1]} />
    </View>
  );
}
