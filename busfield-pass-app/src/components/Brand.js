import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, weight } from '../theme';

// Marca provisória: ícone de ônibus em quadrado arredondado + nome (trocar pelo logotipo definitivo).
export default function Brand({ size = 40 }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="bus" size={size * 0.52} color={colors.onPrimary} />
      </View>
      <Text style={{ color: colors.text, fontSize: 19, fontWeight: weight.semibold, letterSpacing: -0.3 }}>BusField Pass</Text>
    </View>
  );
}
