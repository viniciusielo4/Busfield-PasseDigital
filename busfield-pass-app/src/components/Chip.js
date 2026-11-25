import React from 'react';
import { Pressable, Text } from 'react-native';
import { useTheme, weight } from '../theme';

// Valor rápido: branco quando livre, azul quando selecionado.
export default function Chip({ label, selected, onPress, testID, style }) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID} onPress={onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: !!selected }}
      style={[{ minHeight: 44, paddingHorizontal: 18, justifyContent: 'center', alignItems: 'center', borderRadius: 999, backgroundColor: selected ? colors.primary : colors.surface }, style]}
    >
      <Text style={{ color: selected ? colors.onPrimary : colors.text, fontWeight: weight.semibold, fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}
