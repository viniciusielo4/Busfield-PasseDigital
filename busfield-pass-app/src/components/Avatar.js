import React from 'react';
import { View, Text } from 'react-native';
import { useTheme, weight } from '../theme';
import { initials } from '../utils/text';

export default function Avatar({ name, size = 44 }) {
  const { colors } = useTheme();
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.primary, fontWeight: weight.semibold, fontSize: Math.round(size * 0.36) }}>{initials(name)}</Text>
    </View>
  );
}
