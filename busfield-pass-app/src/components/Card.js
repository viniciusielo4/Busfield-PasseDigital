import React from 'react';
import { View } from 'react-native';
import { useTheme, radius } from '../theme';

// Superfície branca, sem borda: o contraste com o fundo já separa os blocos.
export default function Card({ children, style }) {
  const { colors } = useTheme();
  return <View style={[{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, marginBottom: 12 }, style]}>{children}</View>;
}
